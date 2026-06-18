import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai"

import { requireUser } from "@/lib/actions/utils"
import { chatModel } from "@/lib/ai/provider"
import { tools } from "@/lib/ai/tools"

// Tool loop + model latency can exceed the default; give it room.
export const maxDuration = 60

function systemPrompt(): string {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" })

  return [
    "You are the assistant for a single-user personal workspace covering tasks, notes, timesheets, and documents.",
    `Today is ${dayName}, ${today}. Resolve relative dates (e.g. "Friday", "tomorrow", "next week") to absolute YYYY-MM-DD values before calling tools.`,
    "",
    "Always use the provided tools to read or change data — never claim you did something without calling the matching tool, and never invent ids, tasks, notes, or figures.",
    "When you need a task/document id you don't have, look it up first (list_tasks, search_documents) and reuse the id from the result.",
    "For notes, reformat the user's raw text into a clean concise summary and assign a short category before calling create_note.",
    "Notes can be organised into folders. Use list_folders to see what exists, create_folder to make one, and pass a folder name to create_note to file it — reuse an existing folder when the name matches rather than duplicating.",
    "",
    "After acting, reply in one or two short sentences confirming exactly what you did, leading with a check mark — e.g. \"✓ Created task 'Update homepage', due Fri 19 Jun.\" Keep it natural; the structured result is rendered separately, so don't dump raw data or ids.",
    "If a request is ambiguous or missing required detail, ask a brief clarifying question instead of guessing.",
  ].join("\n")
}

export async function POST(req: Request): Promise<Response> {
  // Auth gate — tools run as this user; all DB access is RLS-scoped to them.
  try {
    await requireUser()
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }

  let body: { messages?: UIMessage[] }
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON body", { status: 400 })
  }

  const messages = body.messages ?? []

  const result = streamText({
    model: chatModel(),
    system: systemPrompt(),
    messages: await convertToModelMessages(messages),
    tools,
    // Let the model call tools then narrate the result over multiple steps.
    stopWhen: stepCountIs(8),
  })

  return result.toUIMessageStreamResponse()
}

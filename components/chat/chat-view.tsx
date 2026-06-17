"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ArrowUp, Square } from "lucide-react"
import { toast } from "sonner"

import { ToolResult } from "@/components/chat/tool-result"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const EXAMPLES = [
  "Create a task to update the homepage on Friday.",
  "Log 3 hours working on authentication.",
  "Show my outstanding tasks.",
  "Find documents related to tax.",
]

const TOOL_LABELS: Record<string, string> = {
  create_task: "Task created",
  update_task: "Task updated",
  move_task: "Task moved",
  list_tasks: "Tasks loaded",
  create_note: "Note saved",
  search_notes: "Notes found",
  log_time: "Time logged",
  list_time: "Time loaded",
  search_documents: "Documents found",
  summarise_document: "Document summarised",
}

type ToolUIPart = {
  type: string
  toolCallId: string
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
  output?: unknown
  errorText?: string
}

// The AI SDK types tool parts as a wide union; narrow by the `tool-` prefix.
function asToolPart(part: { type: string }): ToolUIPart | null {
  return part.type.startsWith("tool-") ? (part as unknown as ToolUIPart) : null
}

function toolName(part: ToolUIPart): string {
  return part.type.slice("tool-".length)
}

export function ChatView() {
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const toasted = useRef<Set<string>>(new Set())

  const busy = status === "submitted" || status === "streaming"

  // Keep the latest message in view as content streams in.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Toast each completed action exactly once.
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue
      for (const part of message.parts) {
        const toolPart = asToolPart(part)
        if (!toolPart) continue
        if (
          toolPart.state === "output-available" &&
          !toasted.current.has(toolPart.toolCallId)
        ) {
          toasted.current.add(toolPart.toolCallId)
          toast.success(TOOL_LABELS[toolName(toolPart)] ?? "Done")
        } else if (
          toolPart.state === "output-error" &&
          !toasted.current.has(toolPart.toolCallId)
        ) {
          toasted.current.add(toolPart.toolCallId)
          toast.error(toolPart.errorText ?? "That action failed")
        }
      }
    }
  }, [messages])

  function submit() {
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    setInput("")
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
          {messages.length === 0 ? (
            <div className="text-muted-foreground space-y-4 py-10 text-center text-sm">
              <p>Ask me to manage your tasks, notes, time, or documents.</p>
              <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <Button
                    key={ex}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1.5 text-left text-xs whitespace-normal"
                    onClick={() => sendMessage({ text: ex })}
                  >
                    {ex}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-2",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  if (!part.text) return null
                  return (
                    <div
                      key={index}
                      className={cn(
                        "max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {part.text}
                    </div>
                  )
                }

                const toolPart = asToolPart(part)
                if (!toolPart) return null

                if (toolPart.state === "output-available") {
                  return (
                    <div key={index} className="w-full max-w-[90%]">
                      <ToolResult
                        toolName={toolName(toolPart)}
                        output={toolPart.output}
                      />
                    </div>
                  )
                }
                if (toolPart.state === "output-error") {
                  return (
                    <div
                      key={index}
                      className="text-destructive max-w-[90%] text-xs"
                    >
                      {toolPart.errorText ?? "That action failed."}
                    </div>
                  )
                }
                return (
                  <div
                    key={index}
                    className="text-muted-foreground max-w-[90%] text-xs"
                  >
                    Working…
                  </div>
                )
              })}
            </div>
          ))}

          {status === "submitted" ? (
            <div className="text-muted-foreground text-xs">Thinking…</div>
          ) : null}
          {error ? (
            <div className="text-destructive text-xs">
              Something went wrong. Please try again.
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="bg-background border-t pt-3">
        <Card className="mx-auto flex w-full max-w-3xl flex-row items-end gap-2 p-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Message your workspace…"
            rows={1}
            className="max-h-40 min-h-9 flex-1 resize-none border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => stop()}
              aria-label="Stop"
            >
              <Square />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={submit}
              disabled={!input.trim()}
              aria-label="Send"
            >
              <ArrowUp />
            </Button>
          )}
        </Card>
      </div>
    </div>
  )
}

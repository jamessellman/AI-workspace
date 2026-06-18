"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ArrowUp, Sparkles, Square } from "lucide-react"
import { toast } from "sonner"

import { ToolResult } from "@/components/chat/tool-result"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const EXAMPLES = [
  "Create a task to update the homepage on Friday.",
  "Log 3 hours on authentication.",
  "Show my outstanding tasks.",
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

/**
 * Persistent chat docked in the sidebar. Lives in the (app) layout, so the
 * conversation survives navigation and is reachable from every page. Talks to
 * the same /api/chat endpoint as the full-page chat.
 */
export function SidebarChat() {
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const toasted = useRef<Set<string>>(new Set())

  const busy = status === "submitted" || status === "streaming"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue
      for (const part of message.parts) {
        const toolPart = asToolPart(part)
        if (!toolPart || toasted.current.has(toolPart.toolCallId)) continue
        if (toolPart.state === "output-available") {
          toasted.current.add(toolPart.toolCallId)
          toast.success(TOOL_LABELS[toolName(toolPart)] ?? "Done")
        } else if (toolPart.state === "output-error") {
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
      <div className="text-sidebar-foreground/70 flex items-center gap-2 px-3 pb-2 text-xs font-medium">
        <Sparkles className="text-primary size-3.5" />
        Assistant
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-2">
        {messages.length === 0 ? (
          <div className="text-muted-foreground space-y-2 py-2 text-xs">
            <p>Ask me anything about your workspace.</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => sendMessage({ text: ex })}
                  className="border-sidebar-border hover:border-primary/60 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground rounded-md border px-2 py-1.5 text-left transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col gap-1.5",
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
                      "max-w-[92%] rounded-lg px-2.5 py-1.5 text-xs whitespace-pre-wrap",
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
                  <div
                    key={index}
                    className="w-full max-w-full overflow-x-auto text-xs"
                  >
                    <ToolResult
                      toolName={toolName(toolPart)}
                      output={toolPart.output}
                    />
                  </div>
                )
              }
              if (toolPart.state === "output-error") {
                return (
                  <div key={index} className="text-destructive text-xs">
                    {toolPart.errorText ?? "That action failed."}
                  </div>
                )
              }
              return (
                <div
                  key={index}
                  className="text-muted-foreground flex items-center gap-2 text-xs"
                >
                  <Spinner className="text-primary size-3" />
                  Working…
                </div>
              )
            })}
          </div>
        ))}

        {status === "submitted" ? (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Spinner className="text-primary size-3" />
            Thinking…
          </div>
        ) : null}
        {error ? (
          <div className="text-destructive text-xs">
            Something went wrong. Please try again.
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="border-sidebar-border bg-sidebar/80 supports-[backdrop-filter]:bg-sidebar/60 sticky bottom-0 border-t p-2 backdrop-blur">
        <div className="border-sidebar-border bg-sidebar-accent/30 focus-within:border-primary/60 focus-within:ring-primary/30 flex items-end gap-1.5 rounded-lg border p-1.5 transition-colors focus-within:ring-2">
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
            className="max-h-32 min-h-8 flex-1 resize-none border-0 bg-transparent p-1 text-xs shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {busy ? (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              onClick={() => stop()}
              aria-label="Stop"
            >
              <Square />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon-sm"
              onClick={submit}
              disabled={!input.trim()}
              aria-label="Send"
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

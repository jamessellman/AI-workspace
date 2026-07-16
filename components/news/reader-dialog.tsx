"use client"

import { useEffect, useState, useTransition } from "react"
import { format } from "date-fns"
import { marked } from "marked"
import { ExternalLink, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { getReaderArticle, summariseArticle } from "@/lib/actions/feeds"
import type { FeedItemPreview } from "@/types/database"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

let hookAdded = false

async function loadSanitizer() {
  const DOMPurify = (await import("dompurify")).default
  if (!hookAdded) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank")
        node.setAttribute("rel", "noopener noreferrer")
      }
    })
    hookAdded = true
  }
  return DOMPurify
}

export function ReaderDialog({
  item,
  source,
  open,
  onOpenChange,
}: {
  item: FeedItemPreview | null
  source: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [html, setHtml] = useState("")
  const [fallback, setFallback] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [summaryHtml, setSummaryHtml] = useState("")
  const [loading, start] = useTransition()
  const [summarising, startSummarise] = useTransition()

  function onSummarise() {
    if (!item) return
    startSummarise(async () => {
      try {
        const { summary } = await summariseArticle(item.id)
        const DOMPurify = await loadSanitizer()
        setSummaryHtml(DOMPurify.sanitize(marked.parse(summary, { async: false })))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't summarise")
      }
    })
  }

  useEffect(() => {
    if (!open || !item) return
    setHtml("")
    setFallback(null)
    setSummaryHtml("")
    setUrl(item.url)
    start(async () => {
      try {
        const data = await getReaderArticle(item.id)
        setUrl(data.url)
        if (data.html) {
          const DOMPurify = await loadSanitizer()
          setHtml(DOMPurify.sanitize(data.html))
        } else {
          setFallback(
            data.summary ||
              "This one couldn't be loaded here (the site may block it or require a subscription) — open the original to read it."
          )
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't load article")
      }
    })
  }, [open, item])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-words">{item?.title}</DialogTitle>
          <DialogDescription>
            {source}
            {item?.published_at
              ? ` · ${format(new Date(item.published_at), "d MMM yyyy")}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {summaryHtml ? (
            <div className="border-primary/40 bg-primary/5 mb-4 rounded-lg border p-3">
              <div className="text-primary mb-1 flex items-center gap-1.5 text-xs font-medium">
                <Sparkles className="size-3.5" />
                Summary
              </div>
              <div
                className="text-sm [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: summaryHtml }}
              />
            </div>
          ) : null}
          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
              <Spinner className="text-primary" />
              Loading…
            </div>
          ) : html ? (
            <div
              className="text-sm [&_a]:text-primary [&_a]:underline [&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-muted-foreground text-sm">{fallback}</p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button onClick={onSummarise} disabled={summarising}>
            {summarising ? <Spinner /> : <Sparkles />}
            Summarise
          </Button>
          <div className="flex gap-2">
            {url ? (
              <Button asChild variant="outline">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Open original
                </a>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

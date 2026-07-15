"use client"

import { useState, useTransition } from "react"
import { marked } from "marked"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { newsDigest } from "@/lib/actions/feeds"
import { createNote } from "@/lib/actions/notes"
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

export function NewsDigestButton() {
  const [open, setOpen] = useState(false)
  const [html, setHtml] = useState("")
  const [raw, setRaw] = useState("")
  const [loading, startLoad] = useTransition()
  const [saving, startSave] = useTransition()

  function generate() {
    setOpen(true)
    setHtml("")
    setRaw("")
    startLoad(async () => {
      try {
        const { digest } = await newsDigest(24)
        setRaw(digest)
        // DOMPurify needs the DOM, so load it only in the browser at click time.
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
        setHtml(DOMPurify.sanitize(marked.parse(digest, { async: false })))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't build the brief")
        setOpen(false)
      }
    })
  }

  function saveAsNote() {
    startSave(async () => {
      try {
        await createNote({
          title: `News brief — ${new Date().toLocaleDateString()}`,
          body: raw,
          category: "news",
        })
        toast.success("Saved to Notes")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save note")
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={generate}>
        <Sparkles />
        Today&apos;s brief
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Today&apos;s brief</DialogTitle>
            <DialogDescription>The last 24 hours, summarised.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading || !html ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
                <Spinner className="text-primary" />
                Summarising the day…
              </div>
            ) : (
              <div
                className="text-sm [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-4 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={saveAsNote} disabled={!raw || saving}>
              {saving ? <Spinner /> : null}
              Save to Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

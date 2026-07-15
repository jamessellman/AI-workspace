"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { addFeed } from "@/lib/actions/feeds"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export function AddFeedDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [pending, startTransition] = useTransition()

  function submit() {
    const value = url.trim()
    if (!value) return
    startTransition(async () => {
      try {
        await addFeed(value)
        toast.success("Feed added")
        setUrl("")
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add feed")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a feed</DialogTitle>
          <DialogDescription>
            Paste an RSS/Atom feed URL. Most blogs, Substacks and publications
            have one (often at /feed or /rss).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="feed-url">Feed URL</Label>
          <Input
            id="feed-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/feed"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                submit()
              }
            }}
          />
          <p className="text-muted-foreground text-xs">
            Email-only newsletter? Use{" "}
            <a
              href="https://kill-the-newsletter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Kill the Newsletter
            </a>{" "}
            to turn it into a feed, then paste that URL here.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!url.trim() || pending}>
            {pending ? <Spinner /> : null}
            Add feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

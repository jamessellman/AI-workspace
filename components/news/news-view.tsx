"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  CheckCheck,
  ExternalLink,
  MoreHorizontal,
  Newspaper,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  clearAllItems,
  deleteFeed,
  markAllRead,
  refreshFeeds,
  setItemRead,
} from "@/lib/actions/feeds"
import type { Feed, FeedItemPreview } from "@/types/database"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { AddFeedDialog } from "@/components/news/add-feed-dialog"
import { NewsDigestButton } from "@/components/news/news-digest"
import { ReaderDialog } from "@/components/news/reader-dialog"

export function NewsView({
  initialFeeds,
  initialItems,
}: {
  initialFeeds: Feed[]
  initialItems: FeedItemPreview[]
}) {
  const router = useRouter()
  const [feeds, setFeeds] = useState(initialFeeds)
  const [items, setItems] = useState(initialItems)
  const [selected, setSelected] = useState<string>("all")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [readerItem, setReaderItem] = useState<FeedItemPreview | null>(null)
  const [readerOpen, setReaderOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [pendingDeleteFeed, setPendingDeleteFeed] = useState<Feed | null>(null)
  const [refreshing, startRefresh] = useTransition()
  const autoRan = useRef(false)

  useEffect(() => setFeeds(initialFeeds), [initialFeeds])
  useEffect(() => setItems(initialItems), [initialItems])

  // Refresh on first load (throttled server-side).
  useEffect(() => {
    if (autoRan.current || initialFeeds.length === 0) return
    autoRan.current = true
    ;(async () => {
      try {
        const { newItems } = await refreshFeeds(false)
        if (newItems > 0) router.refresh()
      } catch {
        // ignore background refresh errors
      }
    })()
  }, [initialFeeds.length, router])

  const feedTitle = (id: string) =>
    feeds.find((f) => f.id === id)?.title || "Unknown"

  const unreadByFeed = useMemo(() => {
    const map = new Map<string, number>()
    let total = 0
    for (const it of items) {
      if (it.read) continue
      total += 1
      map.set(it.feed_id, (map.get(it.feed_id) ?? 0) + 1)
    }
    return { map, total }
  }, [items])

  const visible = useMemo(() => {
    return items.filter(
      (it) =>
        (selected === "all" || it.feed_id === selected) &&
        (!unreadOnly || !it.read)
    )
  }, [items, selected, unreadOnly])

  function refreshNow() {
    startRefresh(async () => {
      try {
        const { newItems } = await refreshFeeds(true)
        toast.success(newItems > 0 ? `${newItems} new article${newItems === 1 ? "" : "s"}` : "Up to date")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Refresh failed")
      }
    })
  }

  function markRead(item: FeedItemPreview) {
    if (item.read) return
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)))
    void setItemRead(item.id, true)
  }

  function openReader(item: FeedItemPreview) {
    markRead(item)
    setReaderItem(item)
    setReaderOpen(true)
  }

  function openSource(item: FeedItemPreview) {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer")
    markRead(item)
  }

  function toggleRead(item: FeedItemPreview) {
    const next = !item.read
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: next } : i)))
    void setItemRead(item.id, next)
  }

  function onMarkAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
    startRefresh(async () => {
      try {
        await markAllRead()
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not mark all read")
      }
    })
  }

  function onClearAll() {
    setClearOpen(false)
    setItems([])
    startRefresh(async () => {
      try {
        await clearAllItems()
        toast.success("Cleared — only new articles from now on")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not clear")
      }
    })
  }

  function confirmDeleteFeed() {
    if (!pendingDeleteFeed) return
    const feed = pendingDeleteFeed
    setPendingDeleteFeed(null)
    onDeleteFeed(feed)
  }

  function onDeleteFeed(feed: Feed) {
    setFeeds((prev) => prev.filter((f) => f.id !== feed.id))
    setItems((prev) => prev.filter((i) => i.feed_id !== feed.id))
    if (selected === feed.id) setSelected("all")
    startRefresh(async () => {
      try {
        await deleteFeed(feed.id)
        toast.success("Feed removed")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove feed")
      }
    })
  }

  if (feeds.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="bg-primary/15 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <Newspaper className="size-6" />
        </div>
        <h2 className="text-lg font-semibold">Your news, all in one place</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Add RSS feeds from blogs, Substacks and publications — or turn an
          email newsletter into a feed with Kill the Newsletter — and read them
          here instead of your inbox.
        </p>
        <Button className="mt-4" onClick={() => setAddOpen(true)}>
          <Plus />
          Add your first feed
        </Button>
        <AddFeedDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <SourceChip
            active={selected === "all"}
            label="All"
            count={unreadByFeed.total}
            onClick={() => setSelected("all")}
          />
          {feeds.map((f) => (
            <SourceChip
              key={f.id}
              active={selected === f.id}
              label={f.title || f.url}
              count={unreadByFeed.map.get(f.id) ?? 0}
              onClick={() => setSelected(f.id)}
              onDelete={() => setPendingDeleteFeed(f)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <NewsDigestButton />
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly((v) => !v)}
          >
            Unread
          </Button>
          <Button variant="outline" size="icon-sm" onClick={refreshNow} aria-label="Refresh" disabled={refreshing}>
            {refreshing ? <Spinner /> : <RefreshCw />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="More">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onMarkAllRead}>
                <CheckCheck />
                Mark all read
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setClearOpen(true)}
              >
                <Trash2 />
                Clear all articles
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus />
            Add feed
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {unreadOnly ? "Nothing unread here." : "No articles yet — try Refresh."}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <article
              key={item.id}
              className={cn(
                "group/item hover:border-primary/40 rounded-lg border p-3 transition-colors",
                item.read && "opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                {!item.read ? (
                  <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" aria-label="Unread" />
                ) : (
                  <span className="mt-1.5 size-2 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground mb-0.5 flex items-center gap-2 text-xs">
                    <span className="truncate font-medium">{feedTitle(item.feed_id)}</span>
                    {item.published_at ? (
                      <span>
                        · {formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={() => openReader(item)}
                    className="text-left"
                  >
                    <h3 className={cn("text-sm leading-snug break-words", !item.read && "font-semibold")}>
                      {item.title}
                    </h3>
                  </button>
                  {item.summary ? (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {item.summary}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.url ? (
                    <Button variant="ghost" size="icon-xs" onClick={() => openSource(item)} aria-label="Open original">
                      <ExternalLink />
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" aria-label="Article actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => toggleRead(item)}>
                        Mark as {item.read ? "unread" : "read"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <AddFeedDialog open={addOpen} onOpenChange={setAddOpen} />

      <ReaderDialog
        item={readerItem}
        source={readerItem ? feedTitle(readerItem.feed_id) : ""}
        open={readerOpen}
        onOpenChange={setReaderOpen}
      />

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all articles?</DialogTitle>
            <DialogDescription>
              This removes every stored article. Your feeds stay, and only new
              articles will appear from now on.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onClearAll}>
              Clear all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingDeleteFeed)}
        onOpenChange={(o) => !o && setPendingDeleteFeed(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove feed?</DialogTitle>
            <DialogDescription>
              Remove “{pendingDeleteFeed?.title || pendingDeleteFeed?.url}” and
              its articles? You can add it again anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteFeed(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteFeed}>
              Remove feed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SourceChip({
  active,
  label,
  count,
  onClick,
  onDelete,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
  onDelete?: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick()
      }}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary/60 bg-primary/10 text-foreground"
          : "border-border hover:border-primary/40 hover:bg-muted"
      )}
    >
      <span className="max-w-40 truncate font-medium">{label}</span>
      {count > 0 ? (
        <Badge variant={active ? "default" : "secondary"} className="px-1 py-0">
          {count}
        </Badge>
      ) : null}
      {onDelete ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label="Remove feed"
          className="text-muted-foreground hover:text-destructive -mr-1 ml-0.5"
        >
          <Trash2 className="size-3" />
        </button>
      ) : null}
    </div>
  )
}

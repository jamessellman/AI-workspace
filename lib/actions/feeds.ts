"use server"

import { revalidatePath } from "next/cache"
import { generateText } from "ai"
import Parser from "rss-parser"

import { requireUser } from "@/lib/actions/utils"
import { chatModel } from "@/lib/ai/provider"
import {
  addFeedSchema,
  listItemsSchema,
  type ListItemsInput,
} from "@/lib/validation/feed"
import type { Feed, FeedItemPreview } from "@/types/database"

type SupabaseServerClient = Awaited<ReturnType<typeof requireUser>>["supabase"]

const parser = new Parser()
const REFRESH_THROTTLE_MS = 15 * 60 * 1000
const FETCH_TIMEOUT_MS = 10_000
const MAX_ITEMS_PER_FEED = 60
const MAX_CONTENT_CHARS = 200_000
// Only import items published within this rolling window, so a feed's full
// back-catalogue never floods the reader — you always get the recent stuff.
const IMPORT_WINDOW_MS = 5 * 24 * 60 * 60 * 1000

/** Strip HTML and collapse whitespace for a short article preview. */
function cleanSummary(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600)
}

function toIso(value?: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Fetch + parse a feed and store any new items. Returns the count of new items. */
async function fetchAndStore(
  supabase: SupabaseServerClient,
  userId: string,
  feed: Feed
): Promise<number> {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": "AI-Workspace RSS Reader",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Feed returned ${res.status}`)
  const xml = await res.text()
  const parsed = await parser.parseString(xml)

  const title = parsed.title?.trim() || feed.title || feed.url
  const siteUrl = parsed.link ?? null

  const items = (parsed.items ?? []).slice(0, MAX_ITEMS_PER_FEED).map((it) => {
    const guid = String(it.guid || it.link || it.id || it.title || "").slice(0, 500)
    const rawContent =
      ((it as Record<string, unknown>)["content:encoded"] as string) ||
      (it.content as string) ||
      null
    return {
      guid,
      title: (it.title || "Untitled").toString().slice(0, 500),
      url: it.link ?? null,
      author: (it.creator || it.author || null) as string | null,
      summary: cleanSummary(
        (it.contentSnippet || it.summary || it.content || "") as string
      ),
      content: rawContent ? rawContent.slice(0, MAX_CONTENT_CHARS) : null,
      published_at: toIso(it.isoDate || it.pubDate),
    }
  })

  const { data: existing } = await supabase
    .from("feed_items")
    .select("guid")
    .eq("feed_id", feed.id)
  const have = new Set((existing ?? []).map((r) => r.guid))

  // Import only items published within the rolling window (and not already
  // stored). Keeps the reader to recent articles without flooding.
  const cutoffMs = Date.now() - IMPORT_WINDOW_MS
  const fresh = items.filter((i) => {
    if (!i.guid || have.has(i.guid)) return false
    if (!i.published_at) return true // undated: import once (dedup handles repeats)
    return new Date(i.published_at).getTime() >= cutoffMs
  })

  if (fresh.length > 0) {
    const { error } = await supabase
      .from("feed_items")
      .insert(fresh.map((i) => ({ ...i, user_id: userId, feed_id: feed.id })))
    if (error) throw new Error(error.message)
  }

  await supabase
    .from("feeds")
    .update({
      title,
      site_url: siteUrl,
      last_fetched_at: new Date().toISOString(),
    })
    .eq("id", feed.id)

  return fresh.length
}

export async function listFeeds(): Promise<Feed[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("feeds")
    .select("*")
    .order("title", { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listFeedItems(
  input?: ListItemsInput
): Promise<FeedItemPreview[]> {
  const { supabase } = await requireUser()
  const values = input ? listItemsSchema.parse(input) : {}

  // Exclude the heavy `content` column from the list; fetched on demand for the
  // reader via getFeedItemContent.
  let q = supabase
    .from("feed_items")
    .select(
      "id,user_id,feed_id,guid,title,url,author,summary,published_at,read,created_at"
    )
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200)

  if (values.feedId) q = q.eq("feed_id", values.feedId)
  if (values.unreadOnly) q = q.eq("read", false)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as FeedItemPreview[]
}

/** Full content for the in-app reader (fetched on demand). */
export async function getFeedItemContent(id: string): Promise<{
  content: string | null
  url: string | null
  title: string
  summary: string | null
}> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("feed_items")
    .select("content, url, title, summary")
    .eq("id", id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function addFeed(url: string): Promise<Feed> {
  const { supabase, userId } = await requireUser()
  const values = addFeedSchema.parse({ url })

  const { data: feed, error } = await supabase
    .from("feeds")
    .insert({ user_id: userId, url: values.url })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") throw new Error("You've already added that feed.")
    throw new Error(error.message)
  }

  // Best-effort initial fetch; keep the feed even if the first fetch fails.
  try {
    await fetchAndStore(supabase, userId, feed)
  } catch {
    // leave it — a later refresh can try again
  }

  revalidatePath("/news")
  return feed
}

/** Refresh feeds; throttled unless `force`. Returns count of new items. */
export async function refreshFeeds(force = false): Promise<{ newItems: number }> {
  const { supabase, userId } = await requireUser()
  const { data: feeds, error } = await supabase.from("feeds").select("*")
  if (error) throw new Error(error.message)

  const cutoff = Date.now() - REFRESH_THROTTLE_MS
  const results = await Promise.all(
    (feeds ?? []).map(async (f) => {
      if (
        !force &&
        f.last_fetched_at &&
        new Date(f.last_fetched_at).getTime() > cutoff
      ) {
        return 0
      }
      try {
        return await fetchAndStore(supabase, userId, f)
      } catch {
        return 0
      }
    })
  )

  revalidatePath("/news")
  return { newItems: results.reduce((a, b) => a + b, 0) }
}

/** Clear every stored article. Feeds' fetch marker is reset so the next refresh
 * re-pulls the recent window (a clean slate, then the last few days come back —
 * never the whole backlog). */
export async function clearAllItems(): Promise<void> {
  const { supabase, userId } = await requireUser()
  const { error: delErr } = await supabase
    .from("feed_items")
    .delete()
    .eq("user_id", userId)
  if (delErr) throw new Error(delErr.message)
  const { error: updErr } = await supabase
    .from("feeds")
    .update({ last_fetched_at: null })
    .eq("user_id", userId)
  if (updErr) throw new Error(updErr.message)
  revalidatePath("/news")
}

export async function deleteFeed(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("feeds").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/news")
}

export async function setItemRead(id: string, read: boolean): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("feed_items")
    .update({ read })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

/**
 * Generate a concise, skimmable digest of recent articles so the user can stay
 * current in a few minutes. Summarised server-side via the AI provider.
 */
export async function newsDigest(hours = 24): Promise<{
  digest: string
  count: number
}> {
  const { supabase } = await requireUser()

  const [{ data: rows }, { data: feedRows }] = await Promise.all([
    supabase
      .from("feed_items")
      .select("title, summary, url, published_at, created_at, feed_id")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(80),
    supabase.from("feeds").select("id, title"),
  ])

  const feedTitle = new Map((feedRows ?? []).map((f) => [f.id, f.title]))
  const cutoff = Date.now() - hours * 3600 * 1000
  let items = (rows ?? []).filter((i) => {
    const t = new Date(i.published_at ?? i.created_at).getTime()
    return !Number.isNaN(t) && t >= cutoff
  })
  // If nothing in the window, fall back to the most recent handful.
  if (items.length === 0) items = (rows ?? []).slice(0, 20)

  if (items.length === 0) {
    return { digest: "No articles yet — add feeds and hit Refresh.", count: 0 }
  }

  const lines = items
    .slice(0, 60)
    .map((i) => {
      const src = feedTitle.get(i.feed_id) ?? "Feed"
      const summary = i.summary ? ` — ${i.summary.slice(0, 300)}` : ""
      return `- [${src}] ${i.title}${i.url ? ` (${i.url})` : ""}${summary}`
    })
    .join("\n")

  const { text } = await generateText({
    model: chatModel(),
    system:
      "You are a sharp tech-news editor. Produce a skimmable daily brief a busy developer can read in under 15 minutes.",
    prompt: [
      "Summarise the articles below into a short daily brief.",
      "Group by theme with `## ` headings (e.g. AI, Software Engineering, Tools, Other).",
      "Under each theme, 3–6 one-sentence bullets, each stating the key point and ending with a markdown link to the source, like [Source](url).",
      "Lead with the 1–2 most important items. Prioritise AI and software engineering. Skip fluff and duplicates. Do not invent anything not in the list.",
      "",
      "Articles:",
      lines,
    ].join("\n"),
  })

  return { digest: text.trim(), count: items.length }
}

export async function markAllRead(): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("feed_items")
    .update({ read: true })
    .eq("read", false)
  if (error) throw new Error(error.message)
  revalidatePath("/news")
}

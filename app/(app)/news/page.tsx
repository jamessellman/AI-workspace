import { listFeedItems, listFeeds } from "@/lib/actions/feeds"
import { PageHeader } from "@/components/page-header"
import { NewsView } from "@/components/news/news-view"

export const dynamic = "force-dynamic"

export default async function NewsPage() {
  const [feeds, items] = await Promise.all([listFeeds(), listFeedItems()])

  return (
    <div>
      <PageHeader
        title="News"
        description="Your newsletters and feeds as a reading list. Add RSS feeds and skim the latest."
      />
      <NewsView initialFeeds={feeds} initialItems={items} />
    </div>
  )
}

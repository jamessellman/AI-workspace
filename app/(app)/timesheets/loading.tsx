import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}

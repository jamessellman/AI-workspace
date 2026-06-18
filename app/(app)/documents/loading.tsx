import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full sm:max-w-sm" />
        <Skeleton className="ml-auto h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * A lightweight, theme-aware loading spinner. Uses `currentColor`, so it adapts
 * to its context (e.g. white inside a primary button, violet when wrapped in
 * `text-primary`). Override the size with a `size-*` class.
 */
function Spinner({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Spinner }

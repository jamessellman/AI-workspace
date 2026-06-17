import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/types/database"

/**
 * Browser Supabase client for use in Client Components. Uses the public anon
 * key; all access is constrained by Row Level Security scoped to auth.uid().
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

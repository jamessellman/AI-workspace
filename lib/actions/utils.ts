import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * Resolve the authenticated user, throwing if there is no session. Returns the
 * server Supabase client (RLS-scoped to this user) and the user id. Shared by
 * every server action — the single auth gate for all mutations/reads.
 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  return { supabase, userId: user.id }
}

/**
 * Neutralise characters that carry meaning in a PostgREST `.or()` filter string
 * — `,` separates conditions, `()` group, `*` is the wildcard, `:`/`"` affect
 * quoting — so a free-text search term can't alter the query's structure. RLS
 * already bounds results to the current user; this keeps the filter itself
 * well-formed and free of injected conditions.
 */
export function sanitizeFilterTerm(term: string): string {
  return term
    .replace(/[,()*:"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

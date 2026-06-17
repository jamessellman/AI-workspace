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

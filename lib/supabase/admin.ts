import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

/**
 * Privileged Supabase client using the secret key. SERVER-ONLY — never import
 * this into a Client Component. It bypasses RLS, so use it only for privileged
 * maintenance tasks (e.g. seeding). Day-to-day reads/writes go through the
 * publishable-key client so RLS scopes everything to the authenticated user.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set")
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

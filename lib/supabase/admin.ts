import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

/**
 * Service-role Supabase client. SERVER-ONLY — never import this into a Client
 * Component. It bypasses RLS, so use it only for privileged maintenance tasks
 * (e.g. seeding). Day-to-day reads/writes go through the anon client so RLS
 * scopes everything to the authenticated user.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

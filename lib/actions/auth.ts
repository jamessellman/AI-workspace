"use server"

import { redirect } from "next/navigation"

import { requireUser } from "@/lib/actions/utils"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/** Sign the current user out and return to the login screen. */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/**
 * Permanently delete the current user's account. Deleting the auth user
 * cascade-deletes all their rows (tasks, notes, timesheets, documents) via the
 * `on delete cascade` foreign keys. Storage files don't cascade, so we remove
 * them first (best-effort). Requires the privileged admin client.
 */
export async function deleteAccount() {
  const { userId } = await requireUser()
  const admin = createAdminClient()

  for (const bucket of ["documents", "avatars"]) {
    try {
      const { data } = await admin.storage.from(bucket).list(userId)
      if (data && data.length > 0) {
        await admin.storage
          .from(bucket)
          .remove(data.map((file) => `${userId}/${file.name}`))
      }
    } catch {
      // Non-fatal: continue with account deletion even if cleanup fails.
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  // Clear the now-defunct session cookie, then leave.
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

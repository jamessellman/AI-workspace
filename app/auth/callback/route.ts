import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

/** Only allow same-origin relative paths as the post-auth destination. */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next
  return "/board"
}

/**
 * Auth code-exchange endpoint for email links (password recovery, signup
 * confirmation, magic links, OAuth). Handles both the PKCE `code` flow and the
 * `token_hash` + `type` (verifyOtp) flow, so it works whether you use the
 * default email templates or custom ones. On failure it routes the user
 * somewhere useful with a clear message instead of silently to /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeNext(searchParams.get("next"))

  const supabase = await createClient()

  let ok = false
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    ok = !error
  }

  if (ok) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Failed / missing / expired. Send recovery users back to request a new link
  // with a clear message; everyone else to login.
  const isRecovery = type === "recovery" || next.startsWith("/reset-password")
  const failPath = isRecovery
    ? "/forgot-password?error=expired"
    : "/login?error=auth"
  return NextResponse.redirect(`${origin}${failPath}`)
}

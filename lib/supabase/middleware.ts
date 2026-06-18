import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/types/database"

/** Routes reachable without an authenticated session. */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
]

/** Auth pages a signed-in user shouldn't sit on (reset-password is excluded —
 * it's reached via a recovery session). */
const REDIRECT_WHEN_AUTHED = ["/login", "/signup", "/forgot-password"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

/**
 * Refreshes the Supabase session on every request and redirects
 * unauthenticated users to /login. Must run in middleware so the refreshed
 * auth cookies are written back to the response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Unauthenticated users may only reach public paths.
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Authenticated users hitting login/signup/forgot go to the board.
  if (user && REDIRECT_WHEN_AUTHED.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/board"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

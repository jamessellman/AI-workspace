import { type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

// Next.js 16 "proxy" convention (formerly `middleware`). Runs on every matched
// request to refresh the Supabase session and gate unauthenticated access.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization
     * files, so auth runs on every page and API route.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}

import { redirect } from "next/navigation"

// Authenticated users land on the board; middleware sends everyone else to
// /login before this renders.
export default function HomePage() {
  redirect("/board")
}

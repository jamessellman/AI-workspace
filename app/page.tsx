import { redirect } from "next/navigation"

// Authenticated users land on the News home; middleware sends everyone else to
// /login before this renders.
export default function HomePage() {
  redirect("/news")
}

import { listNotes } from "@/lib/actions/notes"
import { PageHeader } from "@/components/page-header"
import { NotesView } from "@/components/notes/notes-view"

export const dynamic = "force-dynamic"

export default async function NotesPage() {
  const notes = await listNotes()

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Capture and search everything. Full-text search across title and body."
      />
      <NotesView initialNotes={notes} />
    </div>
  )
}

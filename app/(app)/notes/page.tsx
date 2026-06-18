import { listFolders } from "@/lib/actions/folders"
import { listNotes } from "@/lib/actions/notes"
import { PageHeader } from "@/components/page-header"
import { NotesView } from "@/components/notes/notes-view"

export const dynamic = "force-dynamic"

export default async function NotesPage() {
  const [notes, folders] = await Promise.all([listNotes(), listFolders()])

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Organise notes into folders. Full-text search across title and body."
      />
      <NotesView initialNotes={notes} initialFolders={folders} />
    </div>
  )
}

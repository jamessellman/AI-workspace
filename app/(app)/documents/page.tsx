import { listDocuments } from "@/lib/actions/documents"
import { listTasks } from "@/lib/actions/tasks"
import { PageHeader } from "@/components/page-header"
import { DocumentsView } from "@/components/documents/documents-view"

export const dynamic = "force-dynamic"

export default async function DocumentsPage() {
  const [documents, tasks] = await Promise.all([listDocuments(), listTasks()])

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Upload, preview, and organize files. Search by name, category, or summary."
      />
      <DocumentsView
        initialDocuments={documents}
        tasks={tasks.map((t) => ({ id: t.id, title: t.title }))}
      />
    </div>
  )
}

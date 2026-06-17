import { listTasks } from "@/lib/actions/tasks"
import { PageHeader } from "@/components/page-header"
import { Board } from "@/components/board/board"

export const dynamic = "force-dynamic"

export default async function BoardPage() {
  const tasks = await listTasks()

  return (
    <div>
      <PageHeader
        title="Board"
        description="Drag tasks between columns. Order is saved automatically."
      />
      <Board initialTasks={tasks} />
    </div>
  )
}

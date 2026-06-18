"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus } from "lucide-react"

import { TASK_STATUS_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SortableTaskCard } from "@/components/board/task-card"

export function BoardColumn({
  status,
  tasks,
  onAdd,
  onEdit,
  onDelete,
  onMove,
}: {
  status: TaskStatus
  tasks: Task[]
  onAdd: (status: TaskStatus) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onMove: (task: Task, status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  })

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {TASK_STATUS_LABELS[status]}
          </span>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onAdd(status)}
          aria-label={`Add task to ${TASK_STATUS_LABELS[status]}`}
        >
          <Plus />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "bg-muted/40 flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-2 transition-colors",
          isOver && "bg-primary/10 ring-primary/50 ring-2"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 ? (
          <p className="text-muted-foreground px-1 py-6 text-center text-xs">
            No tasks
          </p>
        ) : null}
      </div>
    </div>
  )
}

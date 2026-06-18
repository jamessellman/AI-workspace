"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format } from "date-fns"
import {
  CalendarClock,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"

import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function DueDateBadge({ task }: { task: Task }) {
  if (!task.due_date) return null
  const due = new Date(`${task.due_date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = due < today && task.status !== "complete"

  return (
    <Badge variant={overdue ? "destructive" : "secondary"} className="gap-1">
      <CalendarClock className="size-3" />
      {format(due, "MMM d")}
    </Badge>
  )
}

export function TaskCardContent({ task }: { task: Task }) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <p className="text-sm leading-snug font-medium break-words">
        {task.title}
      </p>
      {task.description ? (
        <p className="text-muted-foreground line-clamp-2 text-xs break-words">
          {task.description}
        </p>
      ) : null}
      {task.due_date ? (
        <div className="flex flex-wrap gap-1 pt-0.5">
          <DueDateBadge task={task} />
        </div>
      ) : null}
    </div>
  )
}

export function SortableTaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onMove: (task: Task, status: TaskStatus) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-slot="task-card"
      {...attributes}
      {...listeners}
      className={cn(
        "group/task flex-row items-start gap-1 p-2.5 shadow-xs transition-all duration-200",
        // The whole card is the drag handle — grab it anywhere and pull.
        "cursor-grab touch-none select-none active:cursor-grabbing",
        "hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_var(--primary)]",
        isDragging && "opacity-50"
      )}
    >
      <span
        aria-hidden
        className="text-muted-foreground/70 -ml-1 pt-0.5 opacity-60 transition-opacity group-hover/task:opacity-100"
      >
        <GripVertical className="size-4" />
      </span>

      <TaskCardContent task={task} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Task actions"
            // Don't let interacting with the menu start a drag.
            onPointerDown={(e) => e.stopPropagation()}
            className="opacity-60 transition-opacity group-hover/task:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => onEdit(task)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TASK_STATUSES.filter((s) => s !== task.status).map((status) => (
                <DropdownMenuItem
                  key={status}
                  onSelect={() => onMove(task, status)}
                >
                  {TASK_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => onDelete(task)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  )
}

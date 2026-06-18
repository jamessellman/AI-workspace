"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { deleteTask, moveTask, reorderTasks } from "@/lib/actions/tasks"
import { TASK_STATUSES } from "@/lib/constants"
import type { Task, TaskStatus } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BoardColumn } from "@/components/board/board-column"
import { TaskCardContent } from "@/components/board/task-card"
import { TaskDialog } from "@/components/board/task-dialog"

type Columns = Record<TaskStatus, Task[]>

function groupTasks(tasks: Task[]): Columns {
  const columns = {
    backlog: [],
    todo: [],
    in_progress: [],
    complete: [],
  } as Columns
  for (const task of tasks) {
    columns[task.status].push(task)
  }
  for (const status of TASK_STATUSES) {
    columns[status].sort((a, b) => a.order_index - b.order_index)
  }
  return columns
}

function isStatus(id: string): id is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(id)
}

export function Board({ initialTasks }: { initialTasks: Task[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [columns, setColumns] = useState<Columns>(() => groupTasks(initialTasks))
  const columnsRef = useRef(columns)
  const setBoth = (next: Columns) => {
    columnsRef.current = next
    setColumns(next)
  }

  // Re-sync with server truth whenever the page revalidates.
  useEffect(() => {
    const next = groupTasks(initialTasks)
    columnsRef.current = next
    setColumns(next)
  }, [initialTasks])

  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // Dialog state.
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [dialogStatus, setDialogStatus] = useState<TaskStatus>("backlog")

  // Delete confirmation.
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function findContainer(id: string): TaskStatus | undefined {
    if (isStatus(id)) return id
    return TASK_STATUSES.find((status) =>
      columnsRef.current[status].some((t) => t.id === id)
    )
  }

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined
    if (task) setActiveTask(task)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const from = findContainer(activeId)
    const to = findContainer(overId)
    if (!from || !to || from === to) return

    const current = columnsRef.current
    const fromItems = current[from]
    const toItems = current[to]
    const moved = fromItems.find((t) => t.id === activeId)
    if (!moved) return

    const overIndex = toItems.findIndex((t) => t.id === overId)
    const insertAt = isStatus(overId)
      ? toItems.length
      : overIndex >= 0
        ? overIndex
        : toItems.length

    setBoth({
      ...current,
      [from]: fromItems.filter((t) => t.id !== activeId),
      [to]: [
        ...toItems.slice(0, insertAt),
        { ...moved, status: to },
        ...toItems.slice(insertAt),
      ],
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const container = findContainer(overId)
    const from = findContainer(activeId)
    if (!container || !from) return

    let next = columnsRef.current
    if (from === container && !isStatus(overId)) {
      const items = next[container]
      const oldIndex = items.findIndex((t) => t.id === activeId)
      const newIndex = items.findIndex((t) => t.id === overId)
      if (oldIndex !== newIndex && newIndex >= 0) {
        next = { ...next, [container]: arrayMove(items, oldIndex, newIndex) }
        setBoth(next)
      }
    }

    persist(next)
  }

  function persist(state: Columns) {
    const positions = TASK_STATUSES.flatMap((status) =>
      state[status].map((task, index) => ({
        id: task.id,
        status,
        orderIndex: index,
      }))
    )

    startTransition(async () => {
      try {
        await reorderTasks(positions)
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save board order"
        )
        router.refresh()
      }
    })
  }

  function handleAdd(status: TaskStatus) {
    setEditingTask(null)
    setDialogStatus(status)
    setDialogOpen(true)
  }

  function handleEdit(task: Task) {
    setEditingTask(task)
    setDialogOpen(true)
  }

  function handleMove(task: Task, status: TaskStatus) {
    // Optimistic: move locally, then persist via the status-only action.
    const current = columnsRef.current
    setBoth({
      ...current,
      [task.status]: current[task.status].filter((t) => t.id !== task.id),
      [status]: [...current[status], { ...task, status }],
    })
    startTransition(async () => {
      try {
        await moveTask({ id: task.id, status })
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not move task")
        router.refresh()
      }
    })
  }

  function confirmDelete() {
    if (!pendingDelete) return
    const task = pendingDelete
    setPendingDelete(null)
    const current = columnsRef.current
    setBoth({
      ...current,
      [task.status]: current[task.status].filter((t) => t.id !== task.id),
    })
    startTransition(async () => {
      try {
        await deleteTask(task.id)
        toast.success("Task deleted")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete task")
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => handleAdd("backlog")}>
          <Plus />
          New task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              tasks={columns[status]}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={setPendingDelete}
              onMove={handleMove}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <Card className="border-primary/60 flex-row items-start gap-1 rotate-2 scale-[1.03] cursor-grabbing p-2.5 shadow-[0_18px_44px_-12px_var(--primary)]">
              <TaskCardContent task={activeTask} />
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultStatus={dialogStatus}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              Delete “{pendingDelete?.title}”? This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

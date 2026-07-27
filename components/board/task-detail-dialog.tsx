"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Pencil, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { setTaskChecklist } from "@/lib/actions/tasks"
import { TASK_STATUS_LABELS } from "@/lib/constants"
import type { ChecklistItem, Task, TaskStatus } from "@/types/database"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function statusVariant(s: TaskStatus): "default" | "secondary" | "outline" {
  if (s === "complete") return "default"
  if (s === "in_progress") return "secondary"
  return "outline"
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onEdit,
}: {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (task: Task) => void
}) {
  const router = useRouter()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newText, setNewText] = useState("")
  const [, startSave] = useTransition()

  useEffect(() => {
    if (open && task) setItems(task.checklist ?? [])
  }, [open, task])

  function persist(next: ChecklistItem[]) {
    if (!task) return
    setItems(next)
    startSave(async () => {
      try {
        await setTaskChecklist(task.id, next)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't save checklist")
      }
    })
  }

  function addItem() {
    const text = newText.trim()
    if (!text) return
    persist([...items, { id: crypto.randomUUID(), text, done: false }])
    setNewText("")
  }

  function toggle(id: string) {
    persist(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
  }

  function remove(id: string) {
    persist(items.filter((i) => i.id !== id))
  }

  const done = items.filter((i) => i.done).length
  const total = items.length
  const pct = total ? Math.round((done / total) * 100) : 0

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="break-words pr-6">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={statusVariant(task.status)}>
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            {task.due_date ? (
              <span className="text-muted-foreground">
                Due {format(new Date(task.due_date), "d MMM yyyy")}
              </span>
            ) : null}
          </div>

          {task.description ? (
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {task.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">No description.</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Checklist</h3>
              {total > 0 ? (
                <span className="text-muted-foreground text-xs">
                  {done}/{total}
                </span>
              ) : null}
            </div>
            {total > 0 ? (
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            ) : null}

            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group/ci hover:bg-muted/50 flex items-start gap-2 rounded-md px-1.5 py-1"
                >
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={() => toggle(item.id)}
                    className="mt-0.5"
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm break-words",
                      item.done && "text-muted-foreground line-through"
                    )}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => remove(item.id)}
                    aria-label="Remove item"
                    className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover/ci:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addItem()
                  }
                }}
                placeholder="Add a checklist item…"
                className="h-8"
              />
              <Button size="sm" variant="outline" onClick={addItem} disabled={!newText.trim()}>
                <Plus />
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onEdit(task)
            }}
          >
            <Pencil />
            Edit task
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

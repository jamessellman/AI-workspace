"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { updateDocument } from "@/lib/actions/documents"
import type { DocumentRow } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { TaskOption } from "@/components/documents/documents-view"

const NO_TASK = "__none__"

export function DocumentDetailDialog({
  document,
  tasks,
  onOpenChange,
  onDownload,
}: {
  document: DocumentRow | null
  tasks: TaskOption[]
  onOpenChange: (open: boolean) => void
  onDownload: (doc: DocumentRow) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState("")
  const [summary, setSummary] = useState("")
  const [taskId, setTaskId] = useState<string>(NO_TASK)

  useEffect(() => {
    if (!document) return
    setCategory(document.category)
    setSummary(document.summary ?? "")
    setTaskId(document.task_id ?? NO_TASK)
  }, [document])

  function handleSave() {
    if (!document) return
    startTransition(async () => {
      try {
        await updateDocument({
          id: document.id,
          category: category.trim() || "general",
          summary: summary.trim() ? summary.trim() : null,
          taskId: taskId === NO_TASK ? null : taskId,
        })
        toast.success("Document updated")
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save")
      }
    })
  }

  return (
    <Dialog open={Boolean(document)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">{document?.filename}</DialogTitle>
          <DialogDescription>
            {document
              ? `${document.mime_type} · uploaded ${new Date(
                  document.created_at
                ).toLocaleDateString()}`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="doc-category">Category</Label>
            <Input
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. tax, contract"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="doc-summary">Summary</Label>
            <Textarea
              id="doc-summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Optional summary (the AI can fill this in later)."
            />
          </div>

          <div className="grid gap-2">
            <Label>Linked task</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No linked task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TASK}>No linked task</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => document && onDownload(document)}
          >
            <Download />
            Download
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Spinner /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

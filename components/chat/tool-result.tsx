"use client"

import { format } from "date-fns"

import { TASK_STATUS_LABELS } from "@/lib/constants"
import type {
  DocumentListResult,
  NoteListResult,
  NoteResult,
  TaskListResult,
  TaskResult,
  TimeListResult,
  TimeResult,
  DocumentSummaryResult,
} from "@/lib/ai/types"
import type { Task, TaskStatus } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function statusVariant(
  status: TaskStatus
): "default" | "secondary" | "outline" {
  if (status === "complete") return "default"
  if (status === "in_progress") return "secondary"
  return "outline"
}

function fmtDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : format(d, "d MMM yyyy")
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={statusVariant(status)}>{TASK_STATUS_LABELS[status]}</Badge>
}

function SingleTask({ task }: { task: Task }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug break-words">
            {task.title}
          </CardTitle>
          <StatusBadge status={task.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-xs">
        {task.description ? (
          <p className="text-muted-foreground whitespace-pre-wrap">
            {task.description}
          </p>
        ) : null}
        <p className="text-muted-foreground">Due: {fmtDate(task.due_date)}</p>
      </CardContent>
    </Card>
  )
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground text-xs">No matching tasks.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead className="w-28">Status</TableHead>
          <TableHead className="w-28">Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell>
              <StatusBadge status={t.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {fmtDate(t.due_date)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function NoteCards({ notes }: { notes: NoteListResult["notes"] }) {
  if (notes.length === 0) {
    return <p className="text-muted-foreground text-xs">No matching notes.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {notes.map((n) => (
        <Card key={n.id} className="gap-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm leading-snug break-words">
                {n.title}
              </CardTitle>
              <Badge variant="secondary">{n.category}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground line-clamp-4 text-xs whitespace-pre-wrap">
              {n.body}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TimeTable({ result }: { result: TimeListResult }) {
  if (result.entries.length === 0) {
    return <p className="text-muted-foreground text-xs">No time logged.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Summary</TableHead>
          <TableHead className="w-24">Date</TableHead>
          <TableHead className="w-16 text-right">Hrs</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {result.entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.project}</TableCell>
            <TableCell className="text-muted-foreground">
              {e.summary || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {fmtDate(e.worked_on)}
            </TableCell>
            <TableCell className="text-right">{Number(e.hours)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right font-semibold">
            {result.totalHours}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}

function DocsTable({ documents }: { documents: DocumentListResult["documents"] }) {
  if (documents.length === 0) {
    return <p className="text-muted-foreground text-xs">No matching documents.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead className="w-32">Category</TableHead>
          <TableHead>Summary</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-medium break-all">{d.filename}</TableCell>
            <TableCell>
              <Badge variant="secondary">{d.category}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground line-clamp-2">
              {d.summary || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * Renders a completed tool's output as structured UI. `output` is `unknown`
 * because the AI SDK doesn't statically link a UI message part to its tool's
 * result type; we cast to the matching shared result type per tool name.
 */
export function ToolResult({
  toolName,
  output,
}: {
  toolName: string
  output: unknown
}) {
  switch (toolName) {
    case "create_task":
    case "update_task":
    case "move_task":
      return <SingleTask task={(output as TaskResult).task} />
    case "list_tasks":
      return <TaskTable tasks={(output as TaskListResult).tasks} />
    case "create_note":
      return <NoteCards notes={[(output as NoteResult).note]} />
    case "search_notes":
      return <NoteCards notes={(output as NoteListResult).notes} />
    case "log_time":
      return (
        <TimeTable
          result={{
            entries: [(output as TimeResult).entry],
            totalHours: Number((output as TimeResult).entry.hours),
            count: 1,
          }}
        />
      )
    case "list_time":
      return <TimeTable result={output as TimeListResult} />
    case "search_documents":
      return <DocsTable documents={(output as DocumentListResult).documents} />
    case "summarise_document": {
      const { document, summary } = output as DocumentSummaryResult
      return (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="text-sm break-words">
              {document.filename}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs whitespace-pre-wrap">
              {summary}
            </p>
          </CardContent>
        </Card>
      )
    }
    default:
      return null
  }
}

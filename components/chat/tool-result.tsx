"use client"

import { format } from "date-fns"
import { CalendarClock, Folder as FolderIcon } from "lucide-react"

import { TASK_STATUS_LABELS } from "@/lib/constants"
import type {
  DocumentListResult,
  EventListResult,
  EventResult,
  FolderListResult,
  FolderResult,
  NewsListResult,
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

function fmtWhen(iso: string, allDay: boolean): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return allDay ? format(d, "EEE d MMM") : format(d, "EEE d MMM, h:mmaaa")
}

function EventCard({
  title,
  startISO,
  allDay,
  recurrence,
  location,
}: {
  title: string
  startISO: string
  allDay: boolean
  recurrence: string
  location: string | null
}) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm break-words">{title}</CardTitle>
          {recurrence !== "none" ? (
            <Badge variant="secondary">{recurrence}</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-1 text-xs">
        <p className="flex items-center gap-1">
          <CalendarClock className="size-3" />
          {fmtWhen(startISO, allDay)}
        </p>
        {location ? <p>{location}</p> : null}
      </CardContent>
    </Card>
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
    case "list_notes":
      return <NoteCards notes={(output as NoteListResult).notes} />
    case "create_folder":
      return (
        <div className="flex items-center gap-2 text-sm">
          <FolderIcon className="text-primary size-4" />
          <span className="font-medium">
            {(output as FolderResult).folder.name}
          </span>
        </div>
      )
    case "list_folders": {
      const { folders } = output as FolderListResult
      if (folders.length === 0) {
        return <p className="text-muted-foreground text-xs">No folders yet.</p>
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {folders.map((f) => (
            <Badge key={f.id} variant="secondary" className="gap-1">
              <FolderIcon className="size-3" />
              {f.name}
            </Badge>
          ))}
        </div>
      )
    }
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
    case "create_event":
    case "update_event": {
      const { event } = output as EventResult
      return (
        <EventCard
          title={event.title}
          startISO={event.starts_at}
          allDay={event.all_day}
          recurrence={event.recurrence}
          location={event.location}
        />
      )
    }
    case "list_events": {
      const { events } = output as EventListResult
      if (events.length === 0) {
        return (
          <p className="text-muted-foreground text-xs">
            No events in that range.
          </p>
        )
      }
      return (
        <div className="space-y-1.5">
          {events.slice(0, 12).map((e) => (
            <div
              key={`${e.id}-${e.occurrence_start}`}
              className="flex items-center gap-2 text-xs"
            >
              <CalendarClock className="text-primary size-3.5 shrink-0" />
              <span className="font-medium">{e.title}</span>
              <span className="text-muted-foreground">
                {fmtWhen(e.occurrence_start, e.all_day)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    case "list_news": {
      const { items } = output as NewsListResult
      if (items.length === 0) {
        return <p className="text-muted-foreground text-xs">No recent articles.</p>
      }
      return (
        <div className="space-y-1.5">
          {items.slice(0, 15).map((it, i) => {
            const href =
              it.url && /^https?:\/\//i.test(it.url) ? it.url : null
            return (
              <div key={i} className="text-xs">
                <span className="text-muted-foreground">{it.source}: </span>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {it.title}
                  </a>
                ) : (
                  <span>{it.title}</span>
                )}
              </div>
            )
          })}
        </div>
      )
    }
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

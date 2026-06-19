"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from "lucide-react"

import type { EventOccurrence } from "@/lib/actions/events"
import type { TaskStatus } from "@/types/database"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventDialog } from "@/components/calendar/event-dialog"

export type CalendarViewMode = "month" | "week" | "day"

type CalendarTask = {
  id: string
  title: string
  due_date: string
  status: TaskStatus
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const VIEWS: CalendarViewMode[] = ["month", "week", "day"]

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd")
}
function eventTime(e: EventOccurrence) {
  return e.all_day ? "All day" : format(new Date(e.occurrence_start), "h:mmaaa")
}

export function CalendarView({
  view,
  date,
  events,
  tasks,
}: {
  view: CalendarViewMode
  date: string
  events: EventOccurrence[]
  tasks: CalendarTask[]
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EventOccurrence | null>(null)
  const [createDate, setCreateDate] = useState<string | null>(null)

  const base = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d)
  }, [date])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>()
    for (const e of events) {
      const key = dayKey(new Date(e.occurrence_start))
      const arr = map.get(key)
      if (arr) arr.push(e)
      else map.set(key, [e])
    }
    return map
  }, [events])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    for (const t of tasks) {
      const arr = map.get(t.due_date)
      if (arr) arr.push(t)
      else map.set(t.due_date, [t])
    }
    return map
  }, [tasks])

  function navigate(d: Date, v: CalendarViewMode = view) {
    router.push(`/calendar?view=${v}&date=${format(d, "yyyy-MM-dd")}`)
  }
  function go(delta: number) {
    if (view === "day") navigate(addDays(base, delta))
    else if (view === "week") navigate(addWeeks(base, delta))
    else navigate(startOfMonth(addMonths(base, delta)))
  }

  function openNew(d?: string) {
    setEditing(null)
    setCreateDate(d ?? null)
    setDialogOpen(true)
  }
  function openEvent(e: EventOccurrence) {
    setEditing(e)
    setDialogOpen(true)
  }

  const title =
    view === "day"
      ? format(base, "EEEE d MMMM yyyy")
      : view === "week"
        ? `${format(startOfWeek(base), "d MMM")} – ${format(endOfWeek(base), "d MMM yyyy")}`
        : format(base, "MMMM yyyy")

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => go(-1)} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => go(1)} aria-label="Next">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(new Date())}>
            Today
          </Button>
          <h2 className="ml-2 text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted/50 inline-flex rounded-lg border p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => navigate(base, v)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => openNew()}>
            <Plus />
            New event
          </Button>
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid
          base={base}
          eventsByDay={eventsByDay}
          tasksByDay={tasksByDay}
          events={events}
          onNew={openNew}
          onEvent={openEvent}
          onTask={() => router.push("/board")}
        />
      ) : view === "week" ? (
        <WeekView
          base={base}
          eventsByDay={eventsByDay}
          tasksByDay={tasksByDay}
          onNew={openNew}
          onEvent={openEvent}
          onTask={() => router.push("/board")}
        />
      ) : (
        <DayView
          base={base}
          events={eventsByDay.get(dayKey(base)) ?? []}
          tasks={tasksByDay.get(dayKey(base)) ?? []}
          onNew={openNew}
          onEvent={openEvent}
          onTask={() => router.push("/board")}
        />
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={createDate}
      />
    </div>
  )
}

function EventChip({
  event,
  onClick,
}: {
  event: EventOccurrence
  onClick: () => void
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="bg-primary/15 text-foreground hover:bg-primary/25 block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-colors"
    >
      <span className="text-muted-foreground">{eventTime(event)}</span>{" "}
      {event.title}
    </button>
  )
}

function TaskChip({ task, onClick }: { task: CalendarTask; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "block w-full truncate rounded border border-dashed px-1.5 py-0.5 text-left text-[11px]",
        task.status === "complete"
          ? "text-muted-foreground line-through"
          : "border-chart-3/50 text-foreground"
      )}
      title="Task due — open board"
    >
      ◆ {task.title}
    </button>
  )
}

function MonthGrid({
  base,
  eventsByDay,
  tasksByDay,
  events,
  onNew,
  onEvent,
  onTask,
}: {
  base: Date
  eventsByDay: Map<string, EventOccurrence[]>
  tasksByDay: Map<string, CalendarTask[]>
  events: EventOccurrence[]
  onNew: (d?: string) => void
  onEvent: (e: EventOccurrence) => void
  onTask: () => void
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(base)),
    end: endOfWeek(endOfMonth(base)),
  })
  const upcoming = useMemo(() => {
    const now = Date.now()
    return events
      .filter((e) => new Date(e.occurrence_end ?? e.occurrence_start).getTime() >= now)
      .slice(0, 8)
  }, [events])

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="bg-muted/40 text-muted-foreground px-2 py-1.5 text-center text-xs font-medium"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = dayKey(day)
            const dayEvents = eventsByDay.get(key) ?? []
            const dayTasks = tasksByDay.get(key) ?? []
            return (
              <div
                key={key}
                onClick={() => onNew(key)}
                className={cn(
                  "bg-background hover:bg-muted/40 min-h-24 cursor-pointer p-1.5 transition-colors",
                  !isSameMonth(day, base) && "bg-muted/20 text-muted-foreground"
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary text-primary-foreground font-semibold"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <EventChip key={`${e.id}-${e.occurrence_start}`} event={e} onClick={() => onEvent(e)} />
                  ))}
                  {dayTasks.slice(0, 2).map((t) => (
                    <TaskChip key={t.id} task={t} onClick={onTask} />
                  ))}
                  {dayEvents.length + dayTasks.length > 5 ? (
                    <span className="text-muted-foreground px-1 text-[10px]">
                      +{dayEvents.length + dayTasks.length - 5} more
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Card className="xl:w-72 xl:shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="text-primary size-4" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-xs">Nothing coming up.</p>
          ) : (
            upcoming.map((e) => (
              <button
                key={`${e.id}-${e.occurrence_start}`}
                onClick={() => onEvent(e)}
                className="hover:bg-muted/50 flex w-full flex-col items-start rounded-md border p-2 text-left transition-colors"
              >
                <span className="text-sm font-medium break-words">{e.title}</span>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(e.occurrence_start), "EEE d MMM")} · {eventTime(e)}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function WeekView({
  base,
  eventsByDay,
  tasksByDay,
  onNew,
  onEvent,
  onTask,
}: {
  base: Date
  eventsByDay: Map<string, EventOccurrence[]>
  tasksByDay: Map<string, CalendarTask[]>
  onNew: (d?: string) => void
  onEvent: (e: EventOccurrence) => void
  onTask: () => void
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(base),
    end: endOfWeek(base),
  })
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-7">
      {days.map((day) => {
        const key = dayKey(day)
        const dayEvents = eventsByDay.get(key) ?? []
        const dayTasks = tasksByDay.get(key) ?? []
        return (
          <div
            key={key}
            onClick={() => onNew(key)}
            className="bg-background hover:bg-muted/30 flex min-h-48 cursor-pointer flex-col gap-1 p-2 transition-colors"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">{format(day, "EEE")}</span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-primary text-primary-foreground font-semibold"
                )}
              >
                {format(day, "d")}
              </span>
            </div>
            {dayEvents.map((e) => (
              <EventChip key={`${e.id}-${e.occurrence_start}`} event={e} onClick={() => onEvent(e)} />
            ))}
            {dayTasks.map((t) => (
              <TaskChip key={t.id} task={t} onClick={onTask} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function DayView({
  base,
  events,
  tasks,
  onNew,
  onEvent,
  onTask,
}: {
  base: Date
  events: EventOccurrence[]
  tasks: CalendarTask[]
  onNew: (d?: string) => void
  onEvent: (e: EventOccurrence) => void
  onTask: () => void
}) {
  const allDay = events.filter((e) => e.all_day)
  const timed = events.filter((e) => !e.all_day)
  const empty = events.length === 0 && tasks.length === 0

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="space-y-4 pt-6">
        {allDay.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">All day</p>
            {allDay.map((e) => (
              <EventChip key={`${e.id}-${e.occurrence_start}`} event={e} onClick={() => onEvent(e)} />
            ))}
          </div>
        ) : null}

        {timed.map((e) => (
          <button
            key={`${e.id}-${e.occurrence_start}`}
            onClick={() => onEvent(e)}
            className="hover:bg-muted/50 flex w-full items-baseline gap-3 rounded-md border p-3 text-left transition-colors"
          >
            <span className="text-muted-foreground w-20 shrink-0 text-xs tabular-nums">
              {format(new Date(e.occurrence_start), "h:mmaaa")}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium break-words">{e.title}</span>
              {e.location ? (
                <span className="text-muted-foreground text-xs">{e.location}</span>
              ) : null}
            </span>
          </button>
        ))}

        {tasks.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">Tasks due</p>
            {tasks.map((t) => (
              <TaskChip key={t.id} task={t} onClick={onTask} />
            ))}
          </div>
        ) : null}

        {empty ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nothing scheduled.
          </p>
        ) : null}

        <Button variant="outline" className="w-full" onClick={() => onNew(dayKey(base))}>
          <Plus />
          Add event on this day
        </Button>
      </CardContent>
    </Card>
  )
}

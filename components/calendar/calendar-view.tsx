"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  addMonths,
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

type CalendarTask = {
  id: string
  title: string
  due_date: string
  status: TaskStatus
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd")
}

function eventTime(e: EventOccurrence) {
  if (e.all_day) return "All day"
  return format(new Date(e.occurrence_start), "h:mma").toLowerCase()
}

export function CalendarView({
  month,
  events,
  tasks,
}: {
  month: string
  events: EventOccurrence[]
  tasks: CalendarTask[]
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EventOccurrence | null>(null)
  const [createDate, setCreateDate] = useState<string | null>(null)

  const base = useMemo(() => {
    const [y, m] = month.split("-").map(Number)
    return new Date(y, m - 1, 1)
  }, [month])

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(base)),
        end: endOfWeek(endOfMonth(base)),
      }),
    [base]
  )

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

  const upcoming = useMemo(() => {
    const now = Date.now()
    return events
      .filter((e) => new Date(e.occurrence_end ?? e.occurrence_start).getTime() >= now)
      .slice(0, 8)
  }, [events])

  function goMonth(delta: number) {
    router.push(`/calendar?month=${format(addMonths(base, delta), "yyyy-MM")}`)
  }
  function goToday() {
    router.push(`/calendar?month=${format(new Date(), "yyyy-MM")}`)
  }

  function openNew(date?: string) {
    setEditing(null)
    setCreateDate(date ?? null)
    setDialogOpen(true)
  }
  function openEvent(e: EventOccurrence) {
    setEditing(e)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => goMonth(-1)} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => goMonth(1)} aria-label="Next month">
              <ChevronRight />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <h2 className="ml-2 text-lg font-semibold tracking-tight">
              {format(base, "MMMM yyyy")}
            </h2>
          </div>
          <Button onClick={() => openNew()}>
            <Plus />
            New event
          </Button>
        </div>

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
            const inMonth = isSameMonth(day, base)
            const today = isToday(day)
            return (
              <div
                key={key}
                onClick={() => openNew(key)}
                className={cn(
                  "bg-background hover:bg-muted/40 min-h-24 cursor-pointer p-1.5 transition-colors",
                  !inMonth && "bg-muted/20 text-muted-foreground"
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      today && "bg-primary text-primary-foreground font-semibold"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button
                      key={`${e.id}-${e.occurrence_start}`}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        openEvent(e)
                      }}
                      className="bg-primary/15 text-foreground hover:bg-primary/25 block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-colors"
                    >
                      <span className="text-muted-foreground">{eventTime(e)}</span>{" "}
                      {e.title}
                    </button>
                  ))}
                  {dayTasks.slice(0, 2).map((t) => (
                    <button
                      key={t.id}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        router.push("/board")
                      }}
                      className={cn(
                        "block w-full truncate rounded border border-dashed px-1.5 py-0.5 text-left text-[11px]",
                        t.status === "complete"
                          ? "text-muted-foreground line-through"
                          : "border-chart-3/50 text-foreground"
                      )}
                      title="Task due — open board"
                    >
                      ◆ {t.title}
                    </button>
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
            <p className="text-muted-foreground text-xs">
              Nothing coming up this month.
            </p>
          ) : (
            upcoming.map((e) => (
              <button
                key={`${e.id}-${e.occurrence_start}`}
                onClick={() => openEvent(e)}
                className="hover:bg-muted/50 flex w-full flex-col items-start rounded-md border p-2 text-left transition-colors"
              >
                <span className="text-sm font-medium break-words">{e.title}</span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  {format(new Date(e.occurrence_start), "EEE d MMM")}
                  {" · "}
                  {eventTime(e)}
                  {e.recurrence !== "none" ? (
                    <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
                      {e.recurrence}
                    </Badge>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={createDate}
      />
    </div>
  )
}

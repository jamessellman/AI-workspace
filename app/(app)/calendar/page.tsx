import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns"

import { listEvents } from "@/lib/actions/events"
import { listTasks } from "@/lib/actions/tasks"
import { PageHeader } from "@/components/page-header"
import { CalendarView, type CalendarViewMode } from "@/components/calendar/calendar-view"

export const dynamic = "force-dynamic"

function parseView(view?: string): CalendarViewMode {
  return view === "week" || view === "day" ? view : "month"
}

function parseDate(date?: string, month?: string): Date {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d)
  }
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number)
    return new Date(y, m - 1, 1)
  }
  return new Date()
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; month?: string }>
}) {
  const sp = await searchParams
  const view = parseView(sp.view)
  const focus = parseDate(sp.date, sp.month)

  // Fetch range for the active view (padded to cover timezone edges).
  let from: Date
  let to: Date
  if (view === "day") {
    from = subDays(startOfDay(focus), 1)
    to = addDays(endOfDay(focus), 1)
  } else if (view === "week") {
    from = subDays(startOfWeek(focus), 1)
    to = addDays(endOfWeek(focus), 1)
  } else {
    from = subDays(startOfWeek(startOfMonth(focus)), 2)
    to = addDays(endOfWeek(endOfMonth(focus)), 2)
  }

  const [events, tasks] = await Promise.all([
    listEvents({ from: from.toISOString(), to: to.toISOString() }),
    listTasks(),
  ])

  const calendarTasks = tasks
    .filter((t) => t.due_date)
    .map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date as string,
      status: t.status,
    }))

  const dateStr = `${focus.getFullYear()}-${String(focus.getMonth() + 1).padStart(2, "0")}-${String(focus.getDate()).padStart(2, "0")}`

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Your events and task deadlines. Ask the assistant to add or move events for you."
      />
      <CalendarView
        view={view}
        date={dateStr}
        events={events}
        tasks={calendarTasks}
      />
    </div>
  )
}

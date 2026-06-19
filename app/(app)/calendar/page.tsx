import {
  addDays,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns"

import { listEvents } from "@/lib/actions/events"
import { listTasks } from "@/lib/actions/tasks"
import { PageHeader } from "@/components/page-header"
import { CalendarView } from "@/components/calendar/calendar-view"

export const dynamic = "force-dynamic"

function parseMonth(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number)
    return { year: y, monthIndex: m - 1, str: month }
  }
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  return { year: y, monthIndex: m, str: `${y}-${String(m + 1).padStart(2, "0")}` }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { year, monthIndex, str } = parseMonth(month)

  // Fetch a padded range around the visible month grid (covers timezone edges).
  const first = new Date(year, monthIndex, 1)
  const from = subDays(startOfWeek(startOfMonth(first)), 2)
  const to = addDays(endOfWeek(endOfMonth(first)), 2)

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

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Your events and task deadlines. Ask the assistant to add or move events for you."
      />
      <CalendarView month={str} events={events} tasks={calendarTasks} />
    </div>
  )
}

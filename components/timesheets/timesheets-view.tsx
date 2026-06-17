"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  endOfWeek,
  format,
  isWithinInterval,
  startOfWeek,
} from "date-fns"
import { CalendarIcon, Trash2, X } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"

import { deleteTimesheet } from "@/lib/actions/timesheets"
import { cn } from "@/lib/utils"
import type { Timesheet } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LogTimeDialog } from "@/components/timesheets/log-time-dialog"

const ALL_PROJECTS = "__all__"

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

function formatHours(hours: number) {
  return `${Number(hours).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}h`
}

export function TimesheetsView({
  initialEntries,
}: {
  initialEntries: Timesheet[]
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<Timesheet[]>(initialEntries)
  const [project, setProject] = useState<string>(ALL_PROJECTS)
  const [range, setRange] = useState<DateRange | undefined>()
  const [, startTransition] = useTransition()

  const projects = useMemo(
    () => Array.from(new Set(entries.map((e) => e.project))).sort(),
    [entries]
  )

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (project !== ALL_PROJECTS && e.project !== project) return false
      if (range?.from) {
        const d = toDate(e.worked_on)
        const end = range.to ?? range.from
        if (!isWithinInterval(d, { start: range.from, end })) return false
      }
      return true
    })
  }, [entries, project, range])

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, e) => sum + Number(e.hours), 0),
    [filtered]
  )

  const weekTotal = useMemo(() => {
    const now = new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 })
    const end = endOfWeek(now, { weekStartsOn: 1 })
    return entries
      .filter((e) => isWithinInterval(toDate(e.worked_on), { start, end }))
      .reduce((sum, e) => sum + Number(e.hours), 0)
  }, [entries])

  const perProject = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of filtered) {
      map.set(e.project, (map.get(e.project) ?? 0) + Number(e.hours))
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [filtered])

  function handleDelete(entry: Timesheet) {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    startTransition(async () => {
      try {
        await deleteTimesheet(entry.id)
        toast.success("Entry deleted")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete entry")
        router.refresh()
      }
    })
  }

  const hasFilters = project !== ALL_PROJECTS || Boolean(range?.from)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-medium">
              This week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatHours(weekTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-medium">
              Total in view
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatHours(filteredTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-medium">
              By project (in view)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perProject.length === 0 ? (
              <p className="text-muted-foreground text-sm">No entries</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {perProject.slice(0, 4).map(([name, hours]) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span className="truncate">{name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatHours(hours)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start font-normal",
                !range?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon />
              {range?.from ? (
                range.to ? (
                  <>
                    {format(range.from, "MMM d")} – {format(range.to, "MMM d")}
                  </>
                ) : (
                  format(range.from, "MMM d")
                )
              ) : (
                "Date range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              autoFocus
            />
          </PopoverContent>
        </Popover>

        {hasFilters ? (
          <Button
            variant="ghost"
            onClick={() => {
              setProject(ALL_PROJECTS)
              setRange(undefined)
            }}
          >
            <X />
            Clear
          </Button>
        ) : null}

        <div className="ml-auto">
          <LogTimeDialog />
        </div>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-20 text-right">Hours</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  No time entries{hasFilters ? " match your filters" : " yet"}.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {format(toDate(entry.worked_on), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{entry.project}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatHours(Number(entry.hours))}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md truncate">
                    {entry.summary}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Delete entry"
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

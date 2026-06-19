"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createEvent,
  deleteEvent,
  updateEvent,
  type EventOccurrence,
} from "@/lib/actions/events"
import type { Recurrence } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}
function toLocalDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function toLocalDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: EventOccurrence | null
  defaultDate?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const isEdit = Boolean(event)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [recurrence, setRecurrence] = useState<Recurrence>("none")
  const [until, setUntil] = useState("")

  useEffect(() => {
    if (!open) return
    if (event) {
      setTitle(event.title)
      setDescription(event.description ?? "")
      setLocation(event.location ?? "")
      setAllDay(event.all_day)
      setStart(
        event.all_day
          ? toLocalDate(event.occurrence_start)
          : toLocalDateTime(event.occurrence_start)
      )
      setEnd(
        event.occurrence_end
          ? event.all_day
            ? toLocalDate(event.occurrence_end)
            : toLocalDateTime(event.occurrence_end)
          : ""
      )
      setRecurrence(event.recurrence)
      setUntil(event.recurrence_until ?? "")
    } else {
      const base = defaultDate ?? toLocalDate(new Date().toISOString())
      setTitle("")
      setDescription("")
      setLocation("")
      setAllDay(false)
      setStart(`${base}T09:00`)
      setEnd(`${base}T10:00`)
      setRecurrence("none")
      setUntil("")
    }
  }, [open, event, defaultDate])

  function onSave() {
    if (!title.trim()) {
      toast.error("Give the event a title")
      return
    }
    const startsAt = allDay ? `${start.slice(0, 10)}T00:00` : start
    const endsAt = end ? (allDay ? `${end.slice(0, 10)}T23:59` : end) : null

    startTransition(async () => {
      try {
        if (isEdit && event) {
          await updateEvent({
            id: event.id,
            title,
            description: description || null,
            location: location || null,
            allDay,
            startsAt,
            endsAt,
            recurrence,
            recurrenceUntil: recurrence === "none" ? null : until || null,
          })
          toast.success("Event updated")
        } else {
          await createEvent({
            title,
            description: description || null,
            location: location || null,
            allDay,
            startsAt,
            endsAt,
            recurrence,
            recurrenceUntil: recurrence === "none" ? null : until || null,
          })
          toast.success("Event created")
        }
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong")
      }
    })
  }

  function onDelete() {
    if (!event) return
    startTransition(async () => {
      try {
        await deleteEvent(event.id)
        toast.success("Event deleted")
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete event")
      }
    })
  }

  const inputType = allDay ? "date" : "datetime-local"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {isEdit && event && event.recurrence !== "none"
              ? "Changes apply to the whole series."
              : "Add an event to your calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Client call"
              autoFocus
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allDay}
              onCheckedChange={(v) => setAllDay(Boolean(v))}
            />
            All day
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ev-start">Starts</Label>
              <Input
                id="ev-start"
                type={inputType}
                value={allDay ? start.slice(0, 10) : start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-end">Ends</Label>
              <Input
                id="ev-end"
                type={inputType}
                value={allDay ? end.slice(0, 10) : end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Repeat</Label>
              <Select
                value={recurrence}
                onValueChange={(v) => setRecurrence(v as Recurrence)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {RECURRENCE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {recurrence !== "none" ? (
              <div className="grid gap-2">
                <Label htmlFor="ev-until">Until (optional)</Label>
                <Input
                  id="ev-until"
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-location">Location</Label>
            <Input
              id="ev-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-desc">Notes</Label>
            <Textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="field-sizing-fixed max-h-40 min-h-16"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit ? (
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={pending}>
              {pending ? <Spinner /> : null}
              {isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

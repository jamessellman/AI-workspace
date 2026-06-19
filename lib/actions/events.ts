"use server"

import { revalidatePath } from "next/cache"
import { addDays, addMonths, addWeeks, addYears, endOfDay } from "date-fns"

import { requireUser } from "@/lib/actions/utils"
import {
  createEventSchema,
  listEventsSchema,
  updateEventSchema,
  type CreateEventInput,
  type ListEventsInput,
  type UpdateEventInput,
} from "@/lib/validation/event"
import type { CalendarEvent, Database, Recurrence } from "@/types/database"

type EventUpdate = Database["public"]["Tables"]["events"]["Update"]

/** A single concrete occurrence of an event (recurring events expand to many). */
export interface EventOccurrence extends CalendarEvent {
  occurrence_start: string
  occurrence_end: string | null
}

const STEP: Record<Exclude<Recurrence, "none">, (d: Date) => Date> = {
  daily: (d) => addDays(d, 1),
  weekly: (d) => addWeeks(d, 1),
  monthly: (d) => addMonths(d, 1),
  yearly: (d) => addYears(d, 1),
}

/** Expand an event into the occurrences that intersect [from, to]. */
function expand(event: CalendarEvent, from: Date, to: Date): EventOccurrence[] {
  const start = new Date(event.starts_at)
  const durationMs = event.ends_at
    ? new Date(event.ends_at).getTime() - start.getTime()
    : 0
  const out: EventOccurrence[] = []

  const push = (s: Date) => {
    const e = durationMs > 0 ? new Date(s.getTime() + durationMs) : null
    out.push({
      ...event,
      occurrence_start: s.toISOString(),
      occurrence_end: e ? e.toISOString() : null,
    })
  }

  if (event.recurrence === "none") {
    const end = event.ends_at ? new Date(event.ends_at) : start
    if (end >= from && start <= to) push(start)
    return out
  }

  const step = STEP[event.recurrence]
  const until = event.recurrence_until
    ? endOfDay(new Date(`${event.recurrence_until}T00:00:00`))
    : null

  let s = start
  let guard = 0
  while (s <= to && guard < 1000) {
    guard += 1
    if (until && s > until) break
    const e = durationMs > 0 ? new Date(s.getTime() + durationMs) : s
    if (e >= from) push(s)
    s = step(s)
  }
  return out
}

/**
 * Single source of truth for the calendar — used by the Calendar UI and the
 * Phase 2 AI event tools. Returns concrete occurrences within the range
 * (recurring events expanded), sorted by start.
 */
export async function listEvents(
  input: ListEventsInput
): Promise<EventOccurrence[]> {
  const { supabase } = await requireUser()
  const { from, to } = listEventsSchema.parse(input)
  const fromD = new Date(from)
  const toD = new Date(to)

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .lte("starts_at", toD.toISOString())
    .order("starts_at", { ascending: true })

  if (error) throw new Error(error.message)

  const occurrences = (data ?? []).flatMap((ev) => expand(ev, fromD, toD))
  occurrences.sort((a, b) =>
    a.occurrence_start.localeCompare(b.occurrence_start)
  )
  return occurrences
}

export async function createEvent(
  input: CreateEventInput
): Promise<CalendarEvent> {
  const { supabase, userId } = await requireUser()
  const v = createEventSchema.parse(input)

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      title: v.title,
      description: v.description ?? null,
      location: v.location ?? null,
      all_day: v.allDay ?? false,
      starts_at: new Date(v.startsAt).toISOString(),
      ends_at: v.endsAt ? new Date(v.endsAt).toISOString() : null,
      recurrence: v.recurrence ?? "none",
      recurrence_until: v.recurrenceUntil ?? null,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/calendar")
  return data
}

export async function updateEvent(
  input: UpdateEventInput
): Promise<CalendarEvent> {
  const { supabase } = await requireUser()
  const v = updateEventSchema.parse(input)

  const patch: EventUpdate = {}
  if (v.title !== undefined) patch.title = v.title
  if (v.description !== undefined) patch.description = v.description
  if (v.location !== undefined) patch.location = v.location
  if (v.allDay !== undefined) patch.all_day = v.allDay
  if (v.startsAt !== undefined) patch.starts_at = new Date(v.startsAt).toISOString()
  if (v.endsAt !== undefined)
    patch.ends_at = v.endsAt ? new Date(v.endsAt).toISOString() : null
  if (v.recurrence !== undefined) patch.recurrence = v.recurrence
  if (v.recurrenceUntil !== undefined) patch.recurrence_until = v.recurrenceUntil

  const { data, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", v.id)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/calendar")
  return data
}

export async function deleteEvent(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("events").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/calendar")
}

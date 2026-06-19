import { z } from "zod"

import type { Recurrence } from "@/types/database"

const recurrenceEnum = z.enum([
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] satisfies Recurrence[] as [Recurrence, ...Recurrence[]])

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
// Accepts a full ISO datetime (e.g. 2026-06-20T14:00) or a date.
const isoDateTime = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date/time")

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  allDay: z.boolean().optional(),
  startsAt: isoDateTime,
  endsAt: isoDateTime.nullable().optional(),
  recurrence: recurrenceEnum.optional(),
  recurrenceUntil: isoDate.nullable().optional(),
})

export const updateEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  allDay: z.boolean().optional(),
  startsAt: isoDateTime.optional(),
  endsAt: isoDateTime.nullable().optional(),
  recurrence: recurrenceEnum.optional(),
  recurrenceUntil: isoDate.nullable().optional(),
})

export const listEventsSchema = z.object({
  from: isoDateTime,
  to: isoDateTime,
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type ListEventsInput = z.infer<typeof listEventsSchema>

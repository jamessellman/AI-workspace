import { z } from "zod"

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")

export const logTimeSchema = z.object({
  project: z.string().trim().min(1, "Project is required.").max(120),
  hours: z.coerce
    .number()
    .positive("Hours must be greater than 0.")
    .max(24, "That's more than a day."),
  summary: z.string().trim().max(2000).optional(),
  workedOn: isoDate.optional(),
})

export const listTimeSchema = z.object({
  project: z.string().trim().min(1).max(120).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
})

export type LogTimeInput = z.infer<typeof logTimeSchema>
export type ListTimeInput = z.infer<typeof listTimeSchema>

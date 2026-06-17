import { z } from "zod"

import type { TaskStatus } from "@/types/database"

// Literal tuple so the parsed type is the TaskStatus union (not `string`).
const statusEnum = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "complete",
] satisfies TaskStatus[] as [TaskStatus, ...TaskStatus[]])

// Accepts an ISO date string (yyyy-MM-dd) or null.
const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .nullable()
  .optional()

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  status: statusEnum.optional(),
  dueDate,
})

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: statusEnum.optional(),
  dueDate,
})

// One task's resolved position on the board.
export const taskPositionSchema = z.object({
  id: z.string().uuid(),
  status: statusEnum,
  orderIndex: z.number().int().min(0),
})

export const reorderSchema = z.object({
  positions: z.array(taskPositionSchema).max(2000),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type TaskPosition = z.infer<typeof taskPositionSchema>

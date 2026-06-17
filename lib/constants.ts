import type { TaskStatus } from "@/types/database"

/** Private Supabase Storage bucket holding uploaded documents. */
export const DOCUMENTS_BUCKET = "documents"

export const TASK_STATUSES: readonly TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "complete",
] as const

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  complete: "Complete",
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as readonly string[]).includes(value)
  )
}

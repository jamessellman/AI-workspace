import type {
  DocumentRow,
  Folder,
  Note,
  Task,
  Timesheet,
} from "@/types/database"

/**
 * Result shapes returned by the AI tools in `lib/ai/tools.ts`.
 *
 * These are pure types (no server code), so the client chat UI can import them
 * to render tool outputs without pulling the server-only tools module into the
 * browser bundle.
 */

export interface TaskResult {
  task: Task
}

export interface TaskListResult {
  tasks: Task[]
  count: number
}

export interface NoteResult {
  note: Note
}

export interface NoteListResult {
  notes: Note[]
  count: number
}

export interface TimeResult {
  entry: Timesheet
}

export interface TimeListResult {
  entries: Timesheet[]
  totalHours: number
  count: number
}

export interface DocumentListResult {
  documents: DocumentRow[]
  count: number
}

export interface DocumentSummaryResult {
  document: DocumentRow
  summary: string
}

export interface FolderResult {
  folder: Folder
}

export interface FolderListResult {
  folders: Folder[]
  count: number
}

/** Names of every tool the model can call. Keep in sync with `tools.ts`. */
export type ToolName =
  | "create_task"
  | "update_task"
  | "move_task"
  | "list_tasks"
  | "create_note"
  | "search_notes"
  | "list_notes"
  | "create_folder"
  | "list_folders"
  | "log_time"
  | "list_time"
  | "search_documents"
  | "summarise_document"

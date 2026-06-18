import "server-only"

import { generateText, tool } from "ai"
import { z } from "zod"

import {
  createDocumentSignedUrl,
  listDocuments,
  searchDocuments,
  updateDocument,
} from "@/lib/actions/documents"
import { createFolder, listFolders } from "@/lib/actions/folders"
import { createNote, listNotes, searchNotes } from "@/lib/actions/notes"
import { createTask, listTasks, moveTask, updateTask } from "@/lib/actions/tasks"
import { listTimesheets, logTime } from "@/lib/actions/timesheets"
import { chatModel } from "@/lib/ai/provider"
import type {
  DocumentListResult,
  DocumentSummaryResult,
  FolderListResult,
  FolderResult,
  NoteListResult,
  NoteResult,
  TaskListResult,
  TaskResult,
  TimeListResult,
  TimeResult,
} from "@/lib/ai/types"

/**
 * Typed AI tools. Every tool is a thin wrapper over the server actions in
 * `lib/actions/*` — those remain the single source of truth and enforce auth +
 * RLS. The model never writes SQL; it only chooses which action to invoke and
 * with what (validated) arguments.
 */

const STATUS = z.enum(["backlog", "todo", "in_progress", "complete"])
const ISO_DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")

// Only these content types are inlined for summarisation; everything else is
// summarised from metadata to avoid shipping a binary parser.
const TEXTUAL_MIME = /^(text\/|application\/(json|xml|x-yaml|yaml))/i
const MAX_SUMMARY_INPUT = 24_000

/** Resolve a folder name to an id, reusing an existing folder (case-insensitive)
 * or creating one. Returns null when no folder name is given. */
async function resolveFolderId(name: string | undefined): Promise<string | null> {
  const trimmed = name?.trim()
  if (!trimmed) return null
  const existing = (await listFolders()).find(
    (f) => f.name.toLowerCase() === trimmed.toLowerCase()
  )
  if (existing) return existing.id
  const created = await createFolder({ name: trimmed })
  return created.id
}

export const tools = {
  create_task: tool({
    description:
      "Create a task on the board. Resolve relative dates (e.g. 'Friday', 'tomorrow') to an absolute YYYY-MM-DD using the current date given in the system prompt. Defaults to the Backlog column unless a status is specified.",
    inputSchema: z.object({
      title: z.string().describe("Short, imperative task title."),
      description: z
        .string()
        .optional()
        .describe("Optional longer detail for the task."),
      status: STATUS.optional().describe("Board column. Defaults to backlog."),
      dueDate: ISO_DATE.optional().describe("Due date as YYYY-MM-DD."),
    }),
    execute: async (input): Promise<TaskResult> => {
      const task = await createTask({
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        dueDate: input.dueDate ?? null,
      })
      return { task }
    },
  }),

  update_task: tool({
    description:
      "Update an existing task's title, description, status, or due date. Requires the task id (look it up with list_tasks first if you only have a title).",
    inputSchema: z.object({
      id: z.string().uuid().describe("The task id to update."),
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      status: STATUS.optional(),
      dueDate: ISO_DATE.nullable().optional(),
    }),
    execute: async (input): Promise<TaskResult> => {
      const task = await updateTask({
        id: input.id,
        title: input.title,
        description: input.description,
        status: input.status,
        dueDate: input.dueDate,
      })
      return { task }
    },
  }),

  move_task: tool({
    description:
      "Move a task to a different board column (backlog, todo, in_progress, complete). Requires the task id.",
    inputSchema: z.object({
      id: z.string().uuid().describe("The task id to move."),
      status: STATUS.describe("Destination column."),
    }),
    execute: async (input): Promise<TaskResult> => {
      const task = await moveTask({ id: input.id, status: input.status })
      return { task }
    },
  }),

  list_tasks: tool({
    description:
      "List the user's tasks. Use for 'show my tasks', 'what's outstanding', etc. By default completed tasks are excluded (outstanding only); pass includeCompleted to include them, or a specific status to filter to one column. Returns task ids you can use with update_task / move_task.",
    inputSchema: z.object({
      status: STATUS.optional().describe("Filter to a single column."),
      query: z
        .string()
        .optional()
        .describe("Filter by text in the title or description."),
      includeCompleted: z
        .boolean()
        .optional()
        .describe("Include completed tasks. Defaults to false."),
    }),
    execute: async (input): Promise<TaskListResult> => {
      let tasks = await listTasks({
        status: input.status,
        query: input.query,
      })
      if (!input.status && !input.includeCompleted) {
        tasks = tasks.filter((t) => t.status !== "complete")
      }
      return { tasks, count: tasks.length }
    },
  }),

  create_note: tool({
    description:
      "Store a note. You MUST first reformat the user's raw content into a clean, concise summary (a few tidy sentences or bullet points) and assign a single short category (e.g. 'meeting', 'idea', 'finance'). Pass the reformatted text as `body`, not the raw input. Optionally file it into a folder by name.",
    inputSchema: z.object({
      title: z
        .string()
        .optional()
        .describe("Short title. Derived from the body if omitted."),
      body: z
        .string()
        .describe("The reformatted summary to store (not the raw input)."),
      category: z
        .string()
        .describe("A single short category you assigned to this note."),
      folder: z
        .string()
        .optional()
        .describe(
          "Optional folder name to file this note under. Reuses an existing folder with that name, or creates it. Check list_folders first to match an existing one."
        ),
    }),
    execute: async (input): Promise<NoteResult> => {
      const folderId = await resolveFolderId(input.folder)
      const note = await createNote({
        title: input.title,
        body: input.body,
        category: input.category,
        folderId,
      })
      return { note }
    },
  }),

  create_folder: tool({
    description:
      "Create a folder to organise notes. Reuses an existing folder if one with the same name already exists (call list_folders first to avoid duplicates).",
    inputSchema: z.object({
      name: z.string().describe("The folder name."),
    }),
    execute: async (input): Promise<FolderResult> => {
      const existing = (await listFolders()).find(
        (f) => f.name.toLowerCase() === input.name.trim().toLowerCase()
      )
      const folder = existing ?? (await createFolder({ name: input.name }))
      return { folder }
    },
  }),

  list_folders: tool({
    description:
      "List the user's note folders. Use to find an existing folder (and its name) before creating one or filing a note.",
    inputSchema: z.object({}),
    execute: async (): Promise<FolderListResult> => {
      const folders = await listFolders()
      return { folders, count: folders.length }
    },
  }),

  search_notes: tool({
    description:
      "Full-text search the user's notes by keyword. Use for 'find my notes about ...'.",
    inputSchema: z.object({
      query: z.string().describe("Keywords to search note titles and bodies."),
    }),
    execute: async (input): Promise<NoteListResult> => {
      const notes = await searchNotes(input.query)
      return { notes, count: notes.length }
    },
  }),

  list_notes: tool({
    description:
      "List the user's notes (most recent first) with their full content, optionally filtered to a folder by name. Use this to find notes by title and read them so you can compile, merge, summarise, or rewrite them into a new note.",
    inputSchema: z.object({
      folder: z
        .string()
        .optional()
        .describe("Optional folder name to list notes from."),
    }),
    execute: async (input): Promise<NoteListResult> => {
      let notes = await listNotes()
      const folderName = input.folder?.trim()
      if (folderName) {
        const folder = (await listFolders()).find(
          (f) => f.name.toLowerCase() === folderName.toLowerCase()
        )
        notes = folder ? notes.filter((n) => n.folder_id === folder.id) : []
      }
      return { notes, count: notes.length }
    },
  }),

  log_time: tool({
    description:
      "Log hours worked against a project. Resolve relative dates to YYYY-MM-DD using the system-prompt date; omit workedOn to default to today.",
    inputSchema: z.object({
      project: z.string().describe("Project the time was spent on."),
      hours: z.number().positive().max(24).describe("Hours worked (0-24)."),
      summary: z
        .string()
        .optional()
        .describe("What was worked on."),
      workedOn: ISO_DATE.optional().describe("Date worked, YYYY-MM-DD."),
    }),
    execute: async (input): Promise<TimeResult> => {
      const entry = await logTime({
        project: input.project,
        hours: input.hours,
        summary: input.summary,
        workedOn: input.workedOn,
      })
      return { entry }
    },
  }),

  list_time: tool({
    description:
      "List logged time entries, optionally filtered by project and/or date range, with the total hours. Use for 'how much time did I log on X', 'show this week's hours', etc.",
    inputSchema: z.object({
      project: z.string().optional().describe("Filter to one project."),
      from: ISO_DATE.optional().describe("Start of range (inclusive)."),
      to: ISO_DATE.optional().describe("End of range (inclusive)."),
    }),
    execute: async (input): Promise<TimeListResult> => {
      const entries = await listTimesheets({
        project: input.project,
        from: input.from,
        to: input.to,
      })
      const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0)
      return { entries, totalHours, count: entries.length }
    },
  }),

  search_documents: tool({
    description:
      "Search the user's documents by filename, category, or summary text. Use for 'find documents related to ...'.",
    inputSchema: z.object({
      query: z.string().describe("Keywords to match against documents."),
    }),
    execute: async (input): Promise<DocumentListResult> => {
      const documents = await searchDocuments(input.query)
      return { documents, count: documents.length }
    },
  }),

  summarise_document: tool({
    description:
      "Summarise a stored document and save the summary to its metadata. Provide either the documentId, or a query to find it by name/category. Returns the saved summary.",
    inputSchema: z.object({
      documentId: z
        .string()
        .uuid()
        .optional()
        .describe("Exact document id, if known."),
      query: z
        .string()
        .optional()
        .describe("Find the document by filename/category when no id is given."),
      instructions: z
        .string()
        .optional()
        .describe("Optional focus for the summary, e.g. 'key dates only'."),
    }),
    execute: async (input): Promise<DocumentSummaryResult> => {
      // Resolve the target document via the same RLS-scoped reads the UI uses.
      const candidates = await listDocuments(input.query)
      const document = input.documentId
        ? candidates.find((d) => d.id === input.documentId)
        : candidates[0]

      if (!document) {
        throw new Error(
          input.documentId
            ? "No document found with that id."
            : "No matching document found to summarise."
        )
      }

      // Inline textual content when we safely can; otherwise summarise from
      // metadata (no binary parsing is shipped in Phase 2).
      let sourceText = ""
      if (TEXTUAL_MIME.test(document.mime_type)) {
        try {
          const url = await createDocumentSignedUrl(document.storage_path)
          const res = await fetch(url)
          if (res.ok) sourceText = (await res.text()).slice(0, MAX_SUMMARY_INPUT)
        } catch {
          // Fall back to metadata-only summary below.
        }
      }

      const prompt = sourceText
        ? `Summarise the document "${document.filename}" in 2-4 sentences.${
            input.instructions ? ` Focus: ${input.instructions}.` : ""
          }\n\n---\n${sourceText}`
        : `Write a brief 1-2 sentence description of a document based only on its metadata, and note that its contents were not readable. Filename: ${document.filename}; type: ${document.mime_type}; category: ${document.category}.`

      const { text } = await generateText({
        model: chatModel(),
        system:
          "You write concise, factual document summaries. No preamble, just the summary.",
        prompt,
      })
      const summary = text.trim()

      const saved = await updateDocument({ id: document.id, summary })
      return { document: saved, summary }
    },
  }),
}

export type WorkspaceTools = typeof tools

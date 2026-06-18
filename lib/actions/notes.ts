"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/actions/utils"
import {
  createNoteSchema,
  updateNoteSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "@/lib/validation/note"
import type { Database, Note } from "@/types/database"

type NoteUpdate = Database["public"]["Tables"]["notes"]["Update"]

/**
 * Single source of truth for note reads/writes — used by both the Notes UI
 * and the Phase 2 AI `create_note` / `search_notes` tools.
 */

export async function listNotes(query?: string): Promise<Note[]> {
  const { supabase } = await requireUser()

  let q = supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false })

  const trimmed = query?.trim()
  if (trimmed) {
    // Full-text search over the generated `search` tsvector column.
    q = q.textSearch("search", trimmed, { type: "websearch", config: "english" })
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Alias used by the AI search_notes tool. */
export async function searchNotes(query: string): Promise<Note[]> {
  return listNotes(query)
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const { supabase, userId } = await requireUser()
  const values = createNoteSchema.parse(input)

  // Derive a title from the first line if none was provided.
  const title =
    values.title?.trim() ||
    values.body.split("\n")[0]?.slice(0, 80).trim() ||
    "Untitled note"

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title,
      body: values.body,
      category: values.category?.trim() || "general",
      folder_id: values.folderId ?? null,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/notes")
  return data
}

export async function updateNote(input: UpdateNoteInput): Promise<Note> {
  const { supabase } = await requireUser()
  const values = updateNoteSchema.parse(input)

  const patch: NoteUpdate = {}
  if (values.title !== undefined) patch.title = values.title
  if (values.body !== undefined) patch.body = values.body
  if (values.category !== undefined) patch.category = values.category
  if (values.folderId !== undefined) patch.folder_id = values.folderId

  const { data, error } = await supabase
    .from("notes")
    .update(patch)
    .eq("id", values.id)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/notes")
  return data
}

/** Move a note into a folder, or out of all folders when folderId is null. */
export async function moveNoteToFolder(
  id: string,
  folderId: string | null
): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("notes")
    .update({ folder_id: folderId })
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/notes")
}

export async function deleteNote(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("notes").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/notes")
}

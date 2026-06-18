"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/actions/utils"
import {
  createFolderSchema,
  updateFolderSchema,
  type CreateFolderInput,
  type UpdateFolderInput,
} from "@/lib/validation/folder"
import type { Folder } from "@/types/database"

/**
 * Single source of truth for folders — used by the Notes UI to organise notes.
 * Deleting a folder un-files its notes (the notes.folder_id FK is
 * `on delete set null`), it does not delete them.
 */
export async function listFolders(): Promise<Folder[]> {
  const { supabase } = await requireUser()

  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const { supabase, userId } = await requireUser()
  const values = createFolderSchema.parse(input)

  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name: values.name })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/notes")
  return data
}

export async function renameFolder(input: UpdateFolderInput): Promise<Folder> {
  const { supabase } = await requireUser()
  const values = updateFolderSchema.parse(input)

  const { data, error } = await supabase
    .from("folders")
    .update({ name: values.name })
    .eq("id", values.id)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/notes")
  return data
}

export async function deleteFolder(id: string): Promise<void> {
  const { supabase } = await requireUser()
  // Notes in this folder are un-filed automatically (FK on delete set null).
  const { error } = await supabase.from("folders").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/notes")
}

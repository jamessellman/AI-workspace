"use server"

import { revalidatePath } from "next/cache"

import { requireUser, sanitizeFilterTerm } from "@/lib/actions/utils"
import { DOCUMENTS_BUCKET } from "@/lib/constants"
import {
  recordDocumentSchema,
  updateDocumentSchema,
  type RecordDocumentInput,
  type UpdateDocumentInput,
} from "@/lib/validation/document"
import type { Database, DocumentRow } from "@/types/database"

type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"]

/**
 * Single source of truth for document metadata and storage operations —
 * shared by the Documents UI and the Phase 2 AI document tools. Files are
 * uploaded to Storage client-side; this records/maintains the metadata row.
 */

export async function listDocuments(query?: string): Promise<DocumentRow[]> {
  const { supabase } = await requireUser()

  let q = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })

  const term = query ? sanitizeFilterTerm(query) : ""
  if (term) {
    const like = `%${term}%`
    q = q.or(
      `filename.ilike.${like},category.ilike.${like},summary.ilike.${like}`
    )
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Alias used by the AI search_documents tool. */
export async function searchDocuments(query: string): Promise<DocumentRow[]> {
  return listDocuments(query)
}

export async function recordDocument(
  input: RecordDocumentInput
): Promise<DocumentRow> {
  const { supabase, userId } = await requireUser()
  const values = recordDocumentSchema.parse(input)

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      filename: values.filename,
      storage_path: values.storagePath,
      mime_type: values.mimeType ?? "application/octet-stream",
      size_bytes: values.sizeBytes,
      category: values.category?.trim() || "general",
      summary: values.summary ?? null,
      task_id: values.taskId ?? null,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/documents")
  return data
}

export async function updateDocument(
  input: UpdateDocumentInput
): Promise<DocumentRow> {
  const { supabase } = await requireUser()
  const values = updateDocumentSchema.parse(input)

  const patch: DocumentUpdate = {}
  if (values.category !== undefined) patch.category = values.category
  if (values.summary !== undefined) patch.summary = values.summary
  if (values.taskId !== undefined) patch.task_id = values.taskId

  const { data, error } = await supabase
    .from("documents")
    .update(patch)
    .eq("id", values.id)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/documents")
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  const { supabase } = await requireUser()

  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  // Remove the underlying file first, then the metadata row.
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([doc.storage_path])
  if (storageError) throw new Error(storageError.message)

  const { error } = await supabase.from("documents").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/documents")
}

/** Create a short-lived signed URL for preview/download. */
export async function createDocumentSignedUrl(
  storagePath: string
): Promise<string> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60)

  if (error) throw new Error(error.message)
  return data.signedUrl
}

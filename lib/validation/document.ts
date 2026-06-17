import { z } from "zod"

export const recordDocumentSchema = z.object({
  filename: z.string().trim().min(1).max(300),
  storagePath: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().max(200).optional(),
  sizeBytes: z.number().int().min(0),
  category: z.string().trim().max(60).optional(),
  summary: z.string().trim().max(5000).nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
})

export const updateDocumentSchema = z.object({
  id: z.string().uuid(),
  category: z.string().trim().max(60).optional(),
  summary: z.string().trim().max(5000).nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
})

export type RecordDocumentInput = z.infer<typeof recordDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>

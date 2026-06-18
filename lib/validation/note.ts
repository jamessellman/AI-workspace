import { z } from "zod"

export const createNoteSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, "Note body is required.").max(50000),
  category: z.string().trim().max(60).optional(),
  folderId: z.string().uuid().nullable().optional(),
})

export const updateNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(50000).optional(),
  category: z.string().trim().max(60).optional(),
  folderId: z.string().uuid().nullable().optional(),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>

import { z } from "zod"

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required.").max(80),
})

export const updateFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Folder name is required.").max(80),
})

export type CreateFolderInput = z.infer<typeof createFolderSchema>
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>

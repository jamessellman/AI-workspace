import { z } from "zod"

export const addFeedSchema = z.object({
  url: z.string().trim().url("Enter a valid feed URL.").max(2000),
})

export const listItemsSchema = z.object({
  feedId: z.string().uuid().optional(),
  unreadOnly: z.boolean().optional(),
})

export type AddFeedInput = z.infer<typeof addFeedSchema>
export type ListItemsInput = z.infer<typeof listItemsSchema>

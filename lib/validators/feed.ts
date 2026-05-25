import { z } from 'zod'

export const FeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
  role:   z.enum(['mom','dad','guardian','expert','admin']).optional(),
  search: z.string().max(200).optional(),
  sort:   z.enum(['recent','helpful','popular','ranked']).optional(),
  sub_village: z.string().optional(),
})

export type FeedQuery = z.infer<typeof FeedQuerySchema>

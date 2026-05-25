import { z } from 'zod'

export const MarkReadSchema = z.object({
  ids:     z.array(z.string().uuid()).optional(),
  markAll: z.boolean().optional(),
})

export type MarkReadInput = z.infer<typeof MarkReadSchema>

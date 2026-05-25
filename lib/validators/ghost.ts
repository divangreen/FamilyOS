import { z } from 'zod'

export const GhostAliasSchema = z.object({
  post_id: z.string().uuid(),
})

export type GhostAliasInput = z.infer<typeof GhostAliasSchema>

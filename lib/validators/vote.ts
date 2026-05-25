import { z } from 'zod'

export const HelpfulVoteSchema = z.object({
  post_id: z.string().uuid(),
})

export const PopularVoteSchema = z.object({
  post_id: z.string().uuid(),
})

export type HelpfulVoteInput = z.infer<typeof HelpfulVoteSchema>
export type PopularVoteInput = z.infer<typeof PopularVoteSchema>

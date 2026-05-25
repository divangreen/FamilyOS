import { z } from 'zod'

export const ExpertApplySchema = z.object({
  credential_type: z.string().min(2).max(100),
  description:     z.string().min(10).max(2000),
})

export const ExpertReviewSchema = z.object({
  application_id: z.string().uuid(),
  decision:       z.enum(['approved', 'rejected']),
  reviewer_note:  z.string().max(500).optional(),
})

export type ExpertApplyInput  = z.infer<typeof ExpertApplySchema>
export type ExpertReviewInput = z.infer<typeof ExpertReviewSchema>

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractText } from '@/lib/ai/claude'
import { z } from 'zod'

const RoutineSchema = z.object({
  child_age_months: z.number().int().min(0).max(216),
  wake_time:        z.string().regex(/^\d{2}:\d{2}$/),
  sleep_time:       z.string().regex(/^\d{2}:\d{2}$/),
  num_naps:         z.number().int().min(0).max(4),
  feeding_type:     z.enum(['breastfed', 'formula', 'solids', 'mixed']),
  concerns:         z.string().max(500).optional(),
  output_format:    z.enum(['table', 'narrative']).default('table'),
})

const SYSTEM = `
You are a pediatric sleep and routine specialist. Create a practical, age-appropriate daily routine.
Rules:
- Use WHO and AAP developmental guidelines for the child's age
- For under 6 months: nap windows, feeding cues, no rigid clock times
- For 6+ months: clock-based schedule is appropriate
- Always note: "Adjust based on your child's cues — this is a guide, not a prescription"
- If output_format is "table", respond in a markdown table: Time | Activity | Notes
- If output_format is "narrative", respond in friendly paragraphs
`.trim()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = RoutineSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 422 })

  const d = parsed.data
  const prompt = `Child age: ${d.child_age_months} months\nWake time: ${d.wake_time}, Bedtime: ${d.sleep_time}\nNumber of naps: ${d.num_naps}\nFeeding: ${d.feeding_type}${d.concerns ? `\nParent concerns: ${d.concerns}` : ''}\nOutput format: ${d.output_format}\n\nPlease generate a full-day routine.`

  const response = await callClaude({
    system:    SYSTEM,
    messages:  [{ role: 'user', content: prompt }],
    maxTokens: 800,
  })

  const routine = extractText(response)

  await supabase.from('saved_routines' as never).upsert({
    user_id: user.id, input: d, output: routine, updated_at: new Date().toISOString(),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('increment_ai_usage', { p_user_id: user.id, p_feature: 'routine' })

  return NextResponse.json({ routine })
}

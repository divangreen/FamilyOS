import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CrySchema = z.object({
  audio_b64: z.string().min(100),
  mime_type: z.enum(['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/mp4']),
})

const SYSTEM = `
You are an expert infant cry analyst. Analyze the cry and classify the most likely cause.
Possible causes: hunger, pain, tiredness, overstimulation, discomfort, needs comfort.

Respond ONLY with valid JSON:
{
  "probable_cause": "hunger",
  "confidence": "high",
  "confidence_pct": 72,
  "reasoning": "One or two sentences.",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "when_to_call_doctor": "If crying is inconsolable for more than 2 hours."
}
confidence must be "high" (>70%), "medium" (40-70%), or "low" (<40%).
`.trim()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CrySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 422 })

  const { audio_b64, mime_type } = parsed.data

  const monthStart = new Date()
  monthStart.setDate(1)
  const { count } = await supabase
    .from('ai_usage' as never)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', 'cry')
    .gte('used_at', monthStart.toISOString().split('T')[0]) as { count: number | null }

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Monthly limit reached', upgrade: true }, { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6-20251001',
      max_tokens: 400,
      system:     SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: mime_type, data: audio_b64 } },
          { type: 'text', text: 'Analyze this baby cry recording and return your JSON assessment.' },
        ],
      }],
    }),
  })

  const data = await response.json() as { content?: { type: string; text: string }[] }
  const raw  = data.content?.find((b) => b.type === 'text')?.text ?? ''

  let result: Record<string, unknown>
  try {
    result = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Analysis failed — please try again' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('increment_ai_usage', { p_user_id: user.id, p_feature: 'cry' })

  return NextResponse.json({
    ...result,
    disclaimer: 'This analysis is a guide only. If your baby seems unwell, consult your pediatrician.',
  })
}

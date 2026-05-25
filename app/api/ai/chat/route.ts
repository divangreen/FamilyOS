import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractText } from '@/lib/ai/claude'
import { COACH_SYSTEM_PROMPT, SAFETY_FOOTER } from '@/lib/ai/prompts/coach'
import { isCrisisMessage } from '@/lib/ai/safety'
import { z } from 'zod'

const ChatSchema = z.object({
  session_id: z.string().uuid().optional(),
  message:    z.string().min(1).max(2000),
  mood_score: z.number().int().min(1).max(10).optional(),
})

const FREE_DAILY_LIMIT = 3

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = ChatSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 422 })

  const { session_id, message, mood_score } = parsed.data

  // Rate limit
  const today = new Date().toISOString().split('T')[0]
  const { data: usage } = await supabase
    .from('ai_usage' as never)
    .select('count')
    .match({ user_id: user.id, feature: 'coach', used_at: today })
    .maybeSingle()

  if (usage && (usage as { count: number }).count >= FREE_DAILY_LIMIT) {
    return NextResponse.json({ error: 'Daily limit reached', upgrade: true }, { status: 429 })
  }

  // Crisis detection
  if (isCrisisMessage(message)) {
    return NextResponse.json({
      reply: `I hear you, and I'm concerned about you. Please reach out to someone who can really help right now.\n\n**Samaritans of Singapore (SOS):** 1-767 (24 hours)\n**IMH Mental Health Helpline:** 6389-2222\n\nYou don't have to face this alone.`,
      crisis: true,
    })
  }

  let sessionMessages: { role: string; content: string }[] = []
  let sessionDbId = session_id

  if (session_id) {
    const { data: session } = await supabase
      .from('coach_sessions' as never)
      .select('messages')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single()
    sessionMessages = (session as { messages: typeof sessionMessages } | null)?.messages ?? []
  }

  sessionMessages.push({ role: 'user', content: message })

  const response = await callClaude({
    system:    COACH_SYSTEM_PROMPT,
    messages:  sessionMessages as { role: 'user' | 'assistant'; content: string }[],
    maxTokens: 400,
  })

  const reply = extractText(response) + SAFETY_FOOTER
  sessionMessages.push({ role: 'assistant', content: reply })

  if (sessionDbId) {
    await supabase.from('coach_sessions' as never)
      .update({ messages: sessionMessages, updated_at: new Date().toISOString() })
      .eq('id', sessionDbId)
  } else {
    const { data: newSession } = await supabase.from('coach_sessions' as never)
      .insert({ user_id: user.id, messages: sessionMessages, mood_score: mood_score ?? null })
      .select('id').single()
    sessionDbId = (newSession as { id: string } | null)?.id
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('increment_ai_usage', { p_user_id: user.id, p_feature: 'coach' })

  return NextResponse.json({ reply, session_id: sessionDbId })
}

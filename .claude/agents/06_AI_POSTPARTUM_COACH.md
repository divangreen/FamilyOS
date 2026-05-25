# Agent 06: AI Postpartum Coach

**Role:** Build an in-app mental wellness chatbot that delivers CBT-style check-ins, breathing exercises, and empathetic conversation for new parents.  
**Research basis:** Woebot RCT — halved postpartum depression/anxiety symptoms vs control. NUS SPA app — 90% of users showed reduced postpartum depression.  
**Works on:** `app/api/ai/chat/`, `app/(app)/coach/`, `components/coach/`  
**Hard rules:** Never diagnose. Always surface crisis resources if distress signals detected. Safety disclaimer on every response.

---

## 1. Database

```sql
-- migrations/ai_coach_sessions.sql

CREATE TABLE coach_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages    jsonb NOT NULL DEFAULT '[]',
  -- array of { role: 'user'|'assistant', content: string, created_at: ISO }
  mood_score  integer,   -- 1–10, user-reported at session start
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coach_sessions_user_idx ON coach_sessions(user_id, updated_at DESC);

ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_sessions" ON coach_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Usage limiter
CREATE TABLE ai_usage (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature  text NOT NULL,
  used_at  date NOT NULL DEFAULT current_date,
  count    integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, feature, used_at)
);
```

---

## 2. System Prompt

```ts
// lib/ai/prompts/coach.ts
export const COACH_SYSTEM_PROMPT = `
You are a warm, empathetic parenting wellness companion for ParentCircle, a community platform for parents in Southeast Asia.

Your approach:
- Use CBT-inspired techniques: gently challenge negative automatic thoughts, validate feelings first
- Keep responses SHORT (3–5 sentences max) — parents are time-poor
- Ask one open question at a time
- Offer a practical micro-exercise when appropriate (box breathing, 5-4-3-2-1 grounding, body scan)
- Be culturally sensitive — users may be from Singapore, Malaysia, Indonesia, Philippines

You are NOT a therapist. You MUST:
- Never diagnose depression, anxiety, or any condition
- Never recommend specific medications
- If the user expresses suicidal ideation, thoughts of harming themselves or their child, immediately respond with crisis resources and encourage them to call a professional
- End every response with the safety footer provided

Crisis resources (Singapore context):
- Samaritans of Singapore (SOS): 1-767 (24hr)
- IMH Mental Health Helpline: 6389-2222
- National Care Hotline: 1800-202-6868
`.trim()

export const SAFETY_FOOTER = `\n\n_Remember: I'm a wellness companion, not a medical professional. If you're struggling, please reach out to a healthcare provider._`

export const CRISIS_KEYWORDS = [
  'kill myself', 'end it', 'not worth living', 'hurt my baby',
  'can\'t go on', 'want to die', 'suicide', 'harm myself',
]
```

---

## 3. API Route

```ts
// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractText } from '@/lib/ai/claude'
import { COACH_SYSTEM_PROMPT, SAFETY_FOOTER, CRISIS_KEYWORDS } from '@/lib/ai/prompts/coach'
import { z } from 'zod'

const ChatSchema = z.object({
  session_id: z.string().uuid().optional(),
  message:    z.string().min(1).max(2000),
  mood_score: z.number().int().min(1).max(10).optional(),
})

const FREE_DAILY_LIMIT = 3

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = ChatSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { session_id, message, mood_score } = parsed.data

  // Rate limit check
  const { data: usage } = await supabase
    .from('ai_usage')
    .select('count')
    .match({ user_id: user.id, feature: 'coach', used_at: new Date().toISOString().split('T')[0] })
    .maybeSingle()

  if (usage && usage.count >= FREE_DAILY_LIMIT) {
    return NextResponse.json({ error: 'Daily limit reached', upgrade: true }, { status: 429 })
  }

  // Crisis detection — immediate short-circuit
  const isCrisis = CRISIS_KEYWORDS.some(kw => message.toLowerCase().includes(kw))
  if (isCrisis) {
    return NextResponse.json({
      reply: `I hear you, and I'm concerned about you. Please reach out to someone who can really help right now.\n\n**Samaritans of Singapore (SOS):** 1-767 (24 hours)\n**IMH Mental Health Helpline:** 6389-2222\n\nYou don't have to face this alone.`,
      crisis: true,
    })
  }

  // Load or create session
  let sessionMessages: { role: string; content: string }[] = []
  let sessionDbId = session_id

  if (session_id) {
    const { data: session } = await supabase
      .from('coach_sessions')
      .select('messages')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single()
    sessionMessages = session?.messages ?? []
  }

  // Append new user message
  sessionMessages.push({ role: 'user', content: message })

  // Call Claude
  const response = await callClaude({
    system:   COACH_SYSTEM_PROMPT,
    messages: sessionMessages as { role: 'user' | 'assistant'; content: string }[],
    maxTokens: 400,
  })

  const reply = extractText(response) + SAFETY_FOOTER

  // Append assistant reply to history
  sessionMessages.push({ role: 'assistant', content: reply })

  // Upsert session
  if (sessionDbId) {
    await supabase.from('coach_sessions')
      .update({ messages: sessionMessages, updated_at: new Date().toISOString() })
      .eq('id', sessionDbId)
  } else {
    const { data: newSession } = await supabase.from('coach_sessions')
      .insert({ user_id: user.id, messages: sessionMessages, mood_score: mood_score ?? null })
      .select('id').single()
    sessionDbId = newSession?.id
  }

  // Increment usage counter
  await supabase.rpc('increment_ai_usage', { p_user_id: user.id, p_feature: 'coach' })

  return NextResponse.json({ reply, session_id: sessionDbId })
}
```

```sql
-- RPC for usage upsert
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id uuid, p_feature text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO ai_usage(user_id, feature, used_at, count)
  VALUES (p_user_id, p_feature, current_date, 1)
  ON CONFLICT (user_id, feature, used_at)
  DO UPDATE SET count = ai_usage.count + 1;
$$;
```

---

## 4. Chat UI Component

```tsx
// components/coach/CoachChat.tsx
'use client'
import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

export function CoachChat() {
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [sessionId, setSessionId]   = useState<string | undefined>()
  const [loading, setLoading]       = useState(false)
  const [crisis, setCrisis]         = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Seed with opener
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: 'Hi, I\'m here for you. How are you feeling today? (1 = really struggling, 10 = doing great)'
    }])
  }, [])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const res = await fetch('/api/ai/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, session_id: sessionId }),
    })
    const data = await res.json()

    setLoading(false)
    if (data.crisis) setCrisis(true)
    if (data.session_id) setSessionId(data.session_id)
    if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
  }

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Wellness Companion</h2>
        <p className="text-xs text-gray-400 mt-0.5">Not a medical service · For support only</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
              ${m.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}
            `}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
              <span className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Crisis banner */}
      {crisis && (
        <div className="mx-4 mb-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
          If you are in immediate danger, please call 995 or go to your nearest A&E.
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="How are you feeling…"
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
```

---

## Completion Checklist

- [ ] `migrations/ai_coach_sessions.sql` — sessions + ai_usage tables
- [ ] `increment_ai_usage` SQL function
- [ ] `lib/ai/claude.ts` — shared Claude wrapper
- [ ] `lib/ai/safety.ts` — disclaimer helper
- [ ] `lib/ai/prompts/coach.ts` — system prompt + crisis keywords
- [ ] `app/api/ai/chat/route.ts` — POST handler with rate limit + crisis detection
- [ ] `components/coach/CoachChat.tsx` — chat UI with typing indicator
- [ ] `app/(app)/coach/page.tsx` — page wrapping the component
- [ ] Crisis keywords trigger immediate helpline response (not Claude)
- [ ] Safety footer appended to every Claude response
- [ ] Dark mode on all UI elements

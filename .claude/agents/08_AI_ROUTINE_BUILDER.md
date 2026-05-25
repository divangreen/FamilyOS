# Agent 08: AI Routine Builder

**Role:** Generate a personalized daily routine for a child based on parent-provided data (age, sleep patterns, feeding schedule) using Claude.  
**Research basis:** Onoco AI Routine — LLM-powered routine that "makes natural changes based on the baby's own data."  
**Works on:** `app/api/ai/routine/`, `app/(app)/routine/`, `components/routine/`

---

## 1. API Route

```ts
// app/api/ai/routine/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractText } from '@/lib/ai/claude'
import { z } from 'zod'

const RoutineSchema = z.object({
  child_age_months:    z.number().int().min(0).max(216),
  wake_time:           z.string().regex(/^\d{2}:\d{2}$/),
  sleep_time:          z.string().regex(/^\d{2}:\d{2}$/),
  num_naps:            z.number().int().min(0).max(4),
  feeding_type:        z.enum(['breastfed', 'formula', 'solids', 'mixed']),
  concerns:            z.string().max(500).optional(),
  output_format:       z.enum(['table', 'narrative']).default('table'),
})

const SYSTEM = `
You are a pediatric sleep and routine specialist. Create a practical, age-appropriate daily routine.

Rules:
- Use WHO and AAP developmental guidelines for the child's age
- Keep the routine realistic for a busy parent — no 10-minute micro-slots
- For under 6 months: nap windows, feeding cues, no rigid clock times
- For 6+ months: clock-based schedule is appropriate
- Always note: "Adjust based on your child's cues — this is a guide, not a prescription"
- If output_format is "table", respond in a markdown table with columns: Time | Activity | Notes
- If output_format is "narrative", respond in friendly paragraphs
`.trim()

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = RoutineSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  const prompt = `
Child age: ${d.child_age_months} months
Wake time: ${d.wake_time}, Bedtime: ${d.sleep_time}
Number of naps: ${d.num_naps}
Feeding: ${d.feeding_type}
${d.concerns ? `Parent concerns: ${d.concerns}` : ''}
Output format: ${d.output_format}

Please generate a full-day routine.
`.trim()

  const response = await callClaude({
    system:    SYSTEM,
    messages:  [{ role: 'user', content: prompt }],
    maxTokens: 800,
  })

  const routine = extractText(response)

  // Save to user's saved routines
  await supabase.from('saved_routines').upsert({
    user_id: user.id,
    input:   d,
    output:  routine,
    updated_at: new Date().toISOString(),
  })

  await supabase.rpc('increment_ai_usage', { p_user_id: user.id, p_feature: 'routine' })

  return NextResponse.json({ routine })
}
```

```sql
-- migrations/saved_routines.sql
CREATE TABLE saved_routines (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  input      jsonb,
  output     text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE saved_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_routines" ON saved_routines FOR ALL USING (auth.uid() = user_id);
```

---

## 2. Routine Form Component

```tsx
// components/routine/RoutineForm.tsx
'use client'
import { useState } from 'react'

export function RoutineForm() {
  const [form, setForm] = useState({
    child_age_months: 6,
    wake_time: '07:00',
    sleep_time: '19:30',
    num_naps: 2,
    feeding_type: 'mixed',
    concerns: '',
    output_format: 'table',
  })
  const [routine, setRoutine]   = useState('')
  const [loading, setLoading]   = useState(false)

  function update(key: string, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function generate() {
    setLoading(true)
    const res  = await fetch('/api/ai/routine', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (data.routine) setRoutine(data.routine)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Child Age (months)</span>
          <input type="number" value={form.child_age_months} min={0} max={216}
            onChange={e => update('child_age_months', +e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Naps per day</span>
          <input type="number" value={form.num_naps} min={0} max={4}
            onChange={e => update('num_naps', +e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Wake time</span>
          <input type="time" value={form.wake_time} onChange={e => update('wake_time', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Bedtime</span>
          <input type="time" value={form.sleep_time} onChange={e => update('sleep_time', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Anything on your mind?</span>
        <textarea value={form.concerns} onChange={e => update('concerns', e.target.value)} rows={2}
          placeholder="e.g. night wakings, transitioning to one nap…"
          className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm resize-none"
        />
      </label>

      <button onClick={generate} disabled={loading}
        className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
        {loading ? 'Building routine…' : 'Generate Routine'}
      </button>

      {routine && (
        <div className="prose prose-sm dark:prose-invert max-w-none mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 font-sans">{routine}</pre>
        </div>
      )}
    </div>
  )
}
```

---

## Completion Checklist (Agent 08)

- [ ] `migrations/saved_routines.sql`
- [ ] `app/api/ai/routine/route.ts`
- [ ] `components/routine/RoutineForm.tsx`
- [ ] `app/(app)/routine/page.tsx`
- [ ] Saved routine persisted per user (upsert)
- [ ] Dark mode on all UI

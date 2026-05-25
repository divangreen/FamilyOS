# Agent 07: AI Cry Interpreter

**Role:** Let parents record a baby cry in the browser and receive a probable cause analysis (hunger, pain, tired, overstimulated) via Claude audio reasoning.  
**Research basis:** UCLA ChatterBaby — ~90% accuracy classifying newborn cries as hunger, pain, or fussiness using Mel-frequency features + CNN.  
**Works on:** `app/api/ai/cry/`, `app/(app)/cry-interpreter/`, `components/cry/`  
**Constraint:** Browser MediaRecorder API → base64 audio → Claude. No server-side audio processing library needed.

---

## How It Works

```
User taps "Record" (5–15 sec)
    ↓
Browser MediaRecorder captures WebM/Opus audio
    ↓
Frontend base64-encodes the blob
    ↓
POST /api/ai/cry  { audio_b64, mime_type }
    ↓
Claude receives audio + structured prompt
    ↓
Returns: probable_cause, confidence, suggestions[]
    ↓
Frontend displays result card
```

---

## 1. API Route

```ts
// app/api/ai/cry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CrySchema = z.object({
  audio_b64: z.string().min(100),
  mime_type: z.enum(['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/mp4']),
})

const SYSTEM = `
You are an expert infant cry analyst. You will receive a short audio recording of a baby crying.
Analyze the cry characteristics and classify the most likely cause.

Possible causes: hunger, pain, tiredness, overstimulation, discomfort (gas/diaper), needs comfort.

Respond ONLY with valid JSON in this exact shape:
{
  "probable_cause": "hunger",
  "confidence": "high",
  "confidence_pct": 72,
  "reasoning": "One or two sentences explaining the audio features that led to this conclusion.",
  "suggestions": [
    "Try feeding if it has been more than 2 hours",
    "Check for hunger cues like rooting or sucking hands"
  ],
  "when_to_call_doctor": "If crying is high-pitched and inconsolable for more than 2 hours."
}

confidence must be "high" (>70%), "medium" (40–70%), or "low" (<40%).
suggestions must be an array of 2–3 practical, actionable strings.
`.trim()

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CrySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { audio_b64, mime_type } = parsed.data

  // Rate limit: 10/month free
  const monthStart = new Date()
  monthStart.setDate(1)
  const { count } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', 'cry')
    .gte('used_at', monthStart.toISOString().split('T')[0])

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Monthly limit reached', upgrade: true }, { status: 429 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 400,
      system:     SYSTEM,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'document',
            source: { type: 'base64', media_type: mime_type, data: audio_b64 },
          },
          {
            type: 'text',
            text: 'Please analyze this baby cry recording and return your JSON assessment.',
          },
        ],
      }],
    }),
  })

  const data = await response.json()
  const raw  = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? ''

  let result
  try {
    result = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Analysis failed — please try again' }, { status: 500 })
  }

  // Log usage
  await supabase.rpc('increment_ai_usage', { p_user_id: user.id, p_feature: 'cry' })

  return NextResponse.json({
    ...result,
    disclaimer: 'This analysis is a guide only. If your baby seems unwell, consult your pediatrician.',
  })
}
```

---

## 2. Recording Hook

```ts
// hooks/useCryRecorder.ts
'use client'
import { useState, useRef } from 'react'

type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

export function useCryRecorder() {
  const [state, setState]       = useState<RecordingState>('idle')
  const [result, setResult]     = useState<CryResult | null>(null)
  const [seconds, setSeconds]   = useState(0)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<NodeJS.Timeout | null>(null)

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder  = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []
    mediaRef.current  = recorder

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop          = () => processRecording(mimeType)

    recorder.start(100)
    setState('recording')
    setSeconds(0)

    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s >= 14) { stopRecording(); return s } // auto-stop at 15s
        return s + 1
      })
    }, 1000)
  }

  function stopRecording() {
    clearInterval(timerRef.current!)
    mediaRef.current?.stop()
    mediaRef.current?.stream.getTracks().forEach(t => t.stop())
    setState('processing')
  }

  async function processRecording(mimeType: string) {
    const blob   = new Blob(chunksRef.current, { type: mimeType })
    const buffer = await blob.arrayBuffer()
    const b64    = btoa(String.fromCharCode(...new Uint8Array(buffer)))

    const res  = await fetch('/api/ai/cry', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_b64: b64, mime_type: mimeType }),
    })
    const data = await res.json()

    if (!res.ok) { setState('error'); return }
    setResult(data)
    setState('done')
  }

  function reset() { setState('idle'); setResult(null); setSeconds(0) }

  return { state, result, seconds, startRecording, stopRecording, reset }
}

export type CryResult = {
  probable_cause:     string
  confidence:         'high' | 'medium' | 'low'
  confidence_pct:     number
  reasoning:          string
  suggestions:        string[]
  when_to_call_doctor: string
  disclaimer:         string
}
```

---

## 3. Cry Interpreter UI

```tsx
// components/cry/CryInterpreter.tsx
'use client'
import { useCryRecorder } from '@/hooks/useCryRecorder'

const CAUSE_EMOJI: Record<string, string> = {
  hunger:          '🍼',
  pain:            '😣',
  tiredness:       '😴',
  overstimulation: '😵',
  discomfort:      '😖',
  'needs comfort':  '🤗',
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low:    'text-red-500 dark:text-red-400',
}

export function CryInterpreter() {
  const { state, result, seconds, startRecording, stopRecording, reset } = useCryRecorder()

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Baby Cry Interpreter</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Record 5–15 seconds of your baby's cry for an AI analysis.
          </p>
        </div>

        {/* Recorder */}
        {(state === 'idle' || state === 'recording') && (
          <div className="flex flex-col items-center gap-4 py-4">
            {state === 'recording' && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {seconds}s / 15s
                </span>
              </div>
            )}
            <button
              onClick={state === 'idle' ? startRecording : stopRecording}
              className={`
                w-20 h-20 rounded-full font-semibold text-white text-sm transition-all
                ${state === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 scale-110'
                  : 'bg-indigo-600 hover:bg-indigo-700'}
              `}
            >
              {state === 'idle' ? 'Record' : 'Stop'}
            </button>
          </div>
        )}

        {state === 'processing' && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            Analysing cry pattern…
          </div>
        )}

        {/* Result */}
        {state === 'done' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-xl">
              <span className="text-4xl">{CAUSE_EMOJI[result.probable_cause] ?? '👶'}</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                  {result.probable_cause}
                </p>
                <p className={`text-xs font-medium ${CONFIDENCE_COLOR[result.confidence]}`}>
                  {result.confidence_pct}% confidence
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">{result.reasoning}</p>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Try this
              </p>
              <ul className="space-y-1.5">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-indigo-500 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-amber-700 dark:text-amber-300">
              <strong>When to call your doctor:</strong> {result.when_to_call_doctor}
            </div>

            <p className="text-xs text-gray-400 italic">{result.disclaimer}</p>

            <button onClick={reset} className="w-full py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              Record again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Completion Checklist

- [ ] `app/api/ai/cry/route.ts` — audio intake + Claude call + JSON parse
- [ ] `hooks/useCryRecorder.ts` — MediaRecorder + base64 encoding
- [ ] `components/cry/CryInterpreter.tsx` — record button + result card
- [ ] `app/(app)/cry-interpreter/page.tsx` — page wrapper
- [ ] Rate limit: 10 analyses/month (uses `ai_usage` table from Agent 06)
- [ ] JSON parse error handled gracefully (retry message shown)
- [ ] Disclaimer shown on every result
- [ ] Dark mode on all UI

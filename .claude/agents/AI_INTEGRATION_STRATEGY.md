# Agent: AI Integration — Strategy & Feature Map

**Role:** Define every AI-powered feature for ParentCircle, map each to the existing platform, and delegate implementation to specialist AI sub-agents.  
**Reads:** All existing agents, `PROJECT_CONTEXT.md`, `AI-Powered_Parenting_Solutions.docx`  
**Writes:** Spawns agents 06–11  
**Stack additions:** Anthropic Claude API (claude-sonnet-4-20250514), Supabase pgvector (RAG), Web Search tool

---

## Strategic Framing

ParentCircle already has the social graph (users, posts, comments, votes, expert verification). AI should make that graph *intelligent* — not replace human connection, but amplify it. Every feature below reads from or writes to existing tables.

---

## Feature Map: Research → Platform

| Research Insight | ParentCircle Feature | Agent |
|---|---|---|
| Woebot RCT: halved postpartum depression symptoms | AI Postpartum Coach chatbot, in-app | 06 |
| ChatterBaby: 90% accurate cry classification | Baby Cry Interpreter (audio → API → response) | 07 |
| Onoco AI Routine: LLM-personalized schedules | Smart Routine Builder from post/comment history | 08 |
| Expert verification + pediatric Q&A | AI Pediatric Assistant with expert-grounded RAG | 09 |
| Feed filtering + cred_score | AI Feed Ranker — surface quality posts intelligently | 10 |
| Ghost posts + community tone | AI Moderation — flag harmful content before publish | 11 |

---

## Shared AI Infrastructure (built once, used by all agents)

### Anthropic API wrapper — `lib/ai/claude.ts`

```ts
// lib/ai/claude.ts
export async function callClaude({
  system,
  messages,
  maxTokens = 1000,
  tools,
}: {
  system:    string
  messages:  { role: 'user' | 'assistant'; content: string }[]
  maxTokens?: number
  tools?:    object[]
}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages,
      ...(tools ? { tools } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Claude API error ${res.status}: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export function extractText(response: Awaited<ReturnType<typeof callClaude>>): string {
  return response.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')
}
```

### Safety wrapper — always used for user-facing AI responses

```ts
// lib/ai/safety.ts
const REFUSAL_PHRASES = [
  'I cannot provide medical diagnoses',
  'Please consult a healthcare professional',
]

export function appendSafetyDisclaimer(text: string, type: 'medical' | 'mental_health'): string {
  const disclaimers = {
    medical:      '\n\n_This is general information only — not a medical diagnosis. Always consult your pediatrician._',
    mental_health: '\n\n_If you are experiencing a crisis, please contact a mental health professional or call a helpline._',
  }
  return text + disclaimers[type]
}
```

### Supabase pgvector setup (for RAG in Agent 09)

```sql
-- migrations/enable_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX posts_embedding_idx
  ON posts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## API Route Namespace

All AI routes live under `/api/ai/`:

```
app/api/ai/
├── chat/route.ts          ← Agent 06: postpartum coach
├── cry/route.ts           ← Agent 07: cry interpreter
├── routine/route.ts       ← Agent 08: routine builder
├── ask/route.ts           ← Agent 09: pediatric assistant (RAG)
├── rank/route.ts          ← Agent 10: feed ranker
└── moderate/route.ts      ← Agent 11: content moderation
```

---

## Sub-Agent Index

| Agent | File | Feature |
|---|---|---|
| 06 | `agents/06_AI_POSTPARTUM_COACH.md` | Mental health chatbot with CBT exercises |
| 07 | `agents/07_AI_CRY_INTERPRETER.md` | Baby cry audio classification |
| 08 | `agents/08_AI_ROUTINE_BUILDER.md` | Personalized daily routine generator |
| 09 | `agents/09_AI_PEDIATRIC_ASSISTANT.md` | RAG-powered Q&A grounded in expert posts |
| 10 | `agents/10_AI_FEED_RANKER.md` | Intelligent feed scoring beyond vote count |
| 11 | `agents/11_AI_MODERATION.md` | Pre-publish content safety screening |

---

## Execution Order

```
Shared infra (lib/ai/claude.ts + lib/ai/safety.ts)
    ↓
09 (RAG / pgvector migration) — database first
    ↓
11 (Moderation) — must exist before new post creation goes live with AI
    ↓
06 (Coach) + 08 (Routine) + 10 (Feed Ranker)  ← parallel
    ↓
07 (Cry Interpreter)  ← standalone, no dependencies
    ↓
09 (Pediatric Assistant frontend)
```

---

## Monetization Hooks (from research)

| Feature | Free Tier | Premium |
|---|---|---|
| Postpartum Coach | 3 sessions/day | Unlimited + session history |
| Pediatric Assistant | 5 questions/day | Unlimited + export to PDF |
| Routine Builder | 1 routine | Multiple saved routines |
| Cry Interpreter | 10 analyses/month | Unlimited |

These limits can be enforced by counting rows in a new `ai_usage` table keyed on `(user_id, feature, date)`.

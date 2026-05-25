# Agent 09: AI Pediatric Assistant (RAG)

**Role:** Answer parent questions grounded in the platform's own expert-verified posts, using vector similarity search + Claude.  
**Research basis:** BabyInsight "24/7 AI pediatric assistant" + Ubie symptom checker. Grounding in expert posts avoids hallucination.  
**Works on:** `app/api/ai/ask/`, `lib/ai/rag.ts`, pgvector migration  
**Depends on:** Agent 05 (types), pgvector enabled, `is_verified_expert` posts in DB

---

## 1. Embedding Pipeline

```ts
// lib/ai/embeddings.ts
// Call this whenever a new expert post is created/updated

export async function embedPost(postId: string, text: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 10,
      system:     'Return only: {"embedding": [...]}.  Embed the input text.',
      messages:   [{ role: 'user', content: text }],
    }),
  })
  // NOTE: Use a dedicated embeddings model in production (e.g. text-embedding-3-small via OpenAI
  // or Voyage AI which Anthropic recommends for Claude RAG pipelines).
  // For MVP, use Supabase's built-in pg_embedding or call an embeddings endpoint.
}

// Recommended: use Supabase Edge Function + Voyage AI
// POST /functions/v1/embed-post  { post_id, text }
```

```sql
-- migrations/enable_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding vector(1024);
CREATE INDEX posts_embedding_ivfflat_idx
  ON posts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 2. RAG Helper

```ts
// lib/ai/rag.ts
import { createClient } from '@/lib/supabase/server'

export async function retrieveRelevantPosts(
  queryEmbedding: number[],
  limit = 4
): Promise<{ id: string; title: string; body: string; author_role: string }[]> {
  const supabase = createClient()

  const { data } = await supabase.rpc('match_posts', {
    query_embedding: queryEmbedding,
    match_threshold: 0.75,
    match_count:     limit,
  })

  return data ?? []
}
```

```sql
-- migrations/match_posts_rpc.sql
CREATE OR REPLACE FUNCTION match_posts(
  query_embedding vector(1024),
  match_threshold float,
  match_count     int
)
RETURNS TABLE (
  id          uuid,
  title       text,
  body        text,
  author_role text,
  similarity  float
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id, p.title, p.body, u.role AS author_role,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM posts p
  JOIN users u ON u.id = p.author_id
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
    AND (u.is_verified_expert = true OR u.role = 'expert')
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## 3. API Route

```ts
// app/api/ai/ask/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractText } from '@/lib/ai/claude'
import { z } from 'zod'

const AskSchema = z.object({
  question:         z.string().min(5).max(1000),
  query_embedding:  z.array(z.number()).length(1024),
  // Embedding computed client-side or via a separate /api/ai/embed route
})

const SYSTEM = `
You are a helpful parenting assistant for ParentCircle. Answer questions using ONLY the provided context from verified expert posts on the platform.

Rules:
- If the context does not contain enough information, say so clearly — do not fabricate
- Always cite the post title(s) you drew from
- Keep answers under 200 words
- End with: "This is general guidance. For your child's specific situation, consult your pediatrician."
`.trim()

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = AskSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { question, query_embedding } = parsed.data

  // Retrieve relevant expert posts
  const { data: posts } = await supabase.rpc('match_posts', {
    query_embedding,
    match_threshold: 0.75,
    match_count:     4,
  })

  const context = (posts ?? [])
    .map((p: { title: string; body: string }) => `## ${p.title}\n${p.body.slice(0, 600)}`)
    .join('\n\n---\n\n')

  const prompt = context.length > 0
    ? `Context from expert posts:\n\n${context}\n\nParent's question: ${question}`
    : `No relevant expert posts found.\n\nParent's question: ${question}`

  const response = await callClaude({
    system:    SYSTEM,
    messages:  [{ role: 'user', content: prompt }],
    maxTokens: 400,
  })

  const answer = extractText(response)
  await supabase.rpc('increment_ai_usage', { p_user_id: user.id, p_feature: 'ask' })

  return NextResponse.json({ answer, sources: (posts ?? []).map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })) })
}
```

---

## Completion Checklist (Agent 09)

- [ ] `migrations/enable_pgvector.sql`
- [ ] `migrations/match_posts_rpc.sql`
- [ ] Embedding pipeline wired to post creation (Supabase Edge Function or webhook)
- [ ] `app/api/ai/ask/route.ts`
- [ ] `app/(app)/ask/page.tsx` with question input + answer display + source links
- [ ] Sources displayed as clickable post links
- [ ] Fallback message when no context found

---
---

# Agent 10: AI Feed Ranker

**Role:** Score and re-rank the feed using Claude's understanding of post quality, not just vote count.  
**Research basis:** `cred_score` on users already captures expertise. AI should surface posts with high signal-to-noise, not just high vote counts.  
**Works on:** `app/api/ai/rank/route.ts`, `app/api/feed/route.ts` (adds `ranked` sort option)

---

## Strategy

The feed ranker is a **batch scoring job** — not real-time per request. It runs on a schedule (e.g. every 6 hours via Supabase Cron) and writes `ai_rank_score` back to the `posts` table.

```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_rank_score float DEFAULT 0.5;
CREATE INDEX posts_ai_rank_idx ON posts(ai_rank_score DESC);
```

---

## Scoring API Route (admin/cron only)

```ts
// app/api/ai/rank/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractText } from '@/lib/ai/claude'

// Secured: only callable by cron secret or admin
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient()

  // Fetch recent unscored posts (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, body, helpful_count, popular_count, author_id, users(cred_score, is_verified_expert)')
    .gte('created_at', since)
    .limit(50)

  if (!posts?.length) return NextResponse.json({ scored: 0 })

  // Score in batches of 10
  const BATCH = 10
  let scored  = 0

  for (let i = 0; i < posts.length; i += BATCH) {
    const batch = posts.slice(i, i + BATCH)
    const postList = batch.map((p, idx) => `
[${idx}] Title: ${p.title}
Body excerpt: ${p.body?.slice(0, 200) ?? ''}
Helpful votes: ${p.helpful_count}, Popular votes: ${p.popular_count}
Author cred score: ${(p as any).users?.cred_score ?? 0}, Verified expert: ${(p as any).users?.is_verified_expert ?? false}
    `.trim()).join('\n\n')

    const response = await callClaude({
      system: `You are a content quality ranker for a parenting community.
Score each post 0.0–1.0 for feed ranking. Consider: clarity, helpfulness, expertise signal, emotional support value.
Respond ONLY with JSON array: [{"idx": 0, "score": 0.85}, ...]`,
      messages: [{ role: 'user', content: postList }],
      maxTokens: 300,
    })

    let scores: { idx: number; score: number }[] = []
    try {
      scores = JSON.parse(extractText(response).replace(/```json|```/g, '').trim())
    } catch { continue }

    for (const { idx, score } of scores) {
      const post = batch[idx]
      if (!post) continue
      await supabase.from('posts').update({ ai_rank_score: score }).eq('id', post.id)
      scored++
    }
  }

  return NextResponse.json({ scored })
}
```

**Feed integration** — add `ranked` as a sort option in the feed query:
```ts
if (sort === 'ranked') {
  query = query.order('ai_rank_score', { ascending: false })
}
```

---

## Completion Checklist (Agent 10)

- [ ] `ALTER TABLE posts ADD COLUMN ai_rank_score float`
- [ ] `app/api/ai/rank/route.ts` — batch scorer secured by `CRON_SECRET`
- [ ] Supabase Cron job configured (every 6 hours)
- [ ] Feed API `?sort=ranked` option
- [ ] Feed UI "Top Picks" tab uses ranked sort

---
---

# Agent 11: AI Content Moderation

**Role:** Screen every new post and comment through Claude before it becomes visible, catching harmful content, misinformation, and unsafe advice.  
**Research basis:** Children's data privacy is parents' #1 concern. Platform trust depends on safe content.  
**Works on:** `app/api/posts/` (post creation), `app/api/comments/` (comment creation), `lib/ai/moderation.ts`

---

## Moderation Helper

```ts
// lib/ai/moderation.ts
import { callClaude, extractText } from './claude'

export type ModerationResult = {
  approved:    boolean
  flags:       string[]
  reason:      string | null
  severity:    'none' | 'low' | 'medium' | 'high'
}

const SYSTEM = `
You are a content moderation AI for a parenting community platform.
Evaluate the submitted content and respond ONLY with valid JSON:
{
  "approved": true,
  "flags": [],
  "reason": null,
  "severity": "none"
}

Flag and set approved=false for:
- Medical misinformation (dangerous advice about infant medication, vaccines, unsafe sleep)
- Content that could endanger a child's safety
- Hate speech, discrimination, or personal attacks
- Sexual content
- Spam or advertising

Severity levels: "none", "low" (mildly off-topic), "medium" (guideline violation), "high" (dangerous/harmful).
For low severity, approved may still be true with a flag for human review.
Be permissive for venting, emotional expression, and honest parenting struggles — this is a support community.
`.trim()

export async function moderateContent(text: string): Promise<ModerationResult> {
  try {
    const response = await callClaude({
      system:    SYSTEM,
      messages:  [{ role: 'user', content: `Content to review:\n\n${text.slice(0, 2000)}` }],
      maxTokens: 200,
    })

    const raw = extractText(response)
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as ModerationResult
  } catch {
    // On AI failure, default to approved (fail open) — log for human review
    console.error('[moderation] AI call failed — defaulting to approved')
    return { approved: true, flags: ['moderation_ai_failed'], reason: null, severity: 'low' }
  }
}
```

---

## Wire Into Post Creation

```ts
// In your post creation route (app/api/posts/route.ts):
import { moderateContent } from '@/lib/ai/moderation'

// After auth + validation, before insert:
const modResult = await moderateContent(`${title}\n\n${body}`)

if (!modResult.approved && modResult.severity === 'high') {
  return NextResponse.json({
    error: 'Your post could not be published. It may contain content that violates our community guidelines.',
    flags: modResult.flags,
  }, { status: 422 })
}

// For medium severity: insert with is_flagged=true for human review
const { data: post } = await supabase.from('posts').insert({
  ...postData,
  is_flagged:        modResult.severity === 'medium',
  moderation_flags:  modResult.flags,
})
```

```sql
-- migrations/moderation_columns.sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_flags jsonb DEFAULT '[]';

-- Admin queue: show flagged posts
CREATE INDEX posts_flagged_idx ON posts(is_flagged) WHERE is_flagged = true;
```

---

## Admin Moderation Queue (add to Agent 03)

```tsx
// app/admin/posts/page.tsx — add flagged filter
const { data: flagged } = await supabase
  .from('posts')
  .select('id, title, moderation_flags, created_at')
  .eq('is_flagged', true)
  .order('created_at', { ascending: true })
```

---

## Completion Checklist (Agent 11)

- [ ] `lib/ai/moderation.ts` — `moderateContent()` helper
- [ ] `migrations/moderation_columns.sql` — `is_flagged`, `moderation_flags`
- [ ] Post creation route calls `moderateContent` before insert
- [ ] Comment creation route calls `moderateContent` before insert
- [ ] High severity → 422 with user-friendly message
- [ ] Medium severity → insert with `is_flagged=true`
- [ ] AI failure → fail open (approved) + flag for human review
- [ ] Admin posts page shows flagged queue
- [ ] Unflag/approve action in admin UI

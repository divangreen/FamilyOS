# Agent: API Hardening

**Role:** Fix all security and correctness gaps in `app/api/` routes.  
**Works on:** `app/api/**`, `lib/validators/`, `lib/supabase/`  
**Must not touch:** UI components, database migrations, seed data

---

## Mission

Eliminate `as any` casts, add Zod validation to every route, gate the seed endpoint, implement `/api/votes/popular`, and ensure every mutation re-authenticates via `getUser()`.

---

## Task List

### 1. Add Zod validators (`lib/validators/`)

Create one file per domain. Each exports a Zod schema + inferred TypeScript type.

#### `lib/validators/vote.ts`
```ts
import { z } from 'zod'

export const HelpfulVoteSchema = z.object({
  post_id: z.string().uuid(),
})

export const PopularVoteSchema = z.object({
  post_id: z.string().uuid(),
})

export type HelpfulVoteInput = z.infer<typeof HelpfulVoteSchema>
export type PopularVoteInput = z.infer<typeof PopularVoteSchema>
```

#### `lib/validators/feed.ts`
```ts
import { z } from 'zod'

export const FeedQuerySchema = z.object({
  cursor:   z.string().uuid().optional(),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
  role:     z.enum(['mom','dad','guardian','expert','admin']).optional(),
  search:   z.string().max(200).optional(),
})

export type FeedQuery = z.infer<typeof FeedQuerySchema>
```

#### `lib/validators/expert.ts`
```ts
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

export type ExpertApplyInput   = z.infer<typeof ExpertApplySchema>
export type ExpertReviewInput  = z.infer<typeof ExpertReviewSchema>
```

#### `lib/validators/ghost.ts`
```ts
import { z } from 'zod'

export const GhostAliasSchema = z.object({
  post_id: z.string().uuid(),
})

export type GhostAliasInput = z.infer<typeof GhostAliasSchema>
```

---

### 2. Implement `/api/votes/popular`

Create `app/api/votes/popular/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PopularVoteSchema } from '@/lib/validators/vote'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = PopularVoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  const { post_id } = parsed.data

  // Toggle: attempt insert; if UNIQUE conflict, delete instead
  const { error: insertError } = await supabase
    .from('reputation_votes')
    .insert({ voter_id: user.id, target_id: post_id, vote_type: 'popular' })

  if (insertError?.code === '23505') {
    // Already voted — remove vote (toggle off)
    await supabase
      .from('reputation_votes')
      .delete()
      .match({ voter_id: user.id, target_id: post_id, vote_type: 'popular' })

    // Decrement popular_count (floor at 0)
    await supabase.rpc('decrement_popular_count', { post_id })
    return NextResponse.json({ voted: false })
  }

  if (insertError) {
    return NextResponse.json({ error: 'Vote failed' }, { status: 500 })
  }

  // Increment popular_count
  await supabase.rpc('increment_popular_count', { post_id })
  return NextResponse.json({ voted: true })
}
```

**Required SQL functions** (add to a new migration):
```sql
-- migrations/add_popular_count_rpc.sql
CREATE OR REPLACE FUNCTION increment_popular_count(post_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE posts SET popular_count = popular_count + 1 WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION decrement_popular_count(post_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE posts
  SET popular_count = GREATEST(popular_count - 1, 0)
  WHERE id = post_id;
$$;
```

---

### 3. Gate the seed route

In `app/api/seed/route.ts`, add at the top of the handler:

```ts
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
}
```

Also add to `vercel.json` or deployment config to set `NODE_ENV=production`.

---

### 4. Harden `/api/votes/helpful`

Refactor to use `HelpfulVoteSchema`. Pattern mirrors the popular route above — replace `as any` casts, parse body with Zod, use typed Supabase responses.

---

### 5. Harden `/api/expert/review` (admin gate)

```ts
// At the top of the PATCH handler
const { data: { user } } = await supabase.auth.getUser()
if (!user || user.app_metadata?.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

### 6. Fix ghost alias retry with exponential backoff

In `app/api/ghost/alias/route.ts`, replace the tight retry loop:

```ts
async function generateUniqueAlias(
  supabase: ReturnType<typeof createClient>,
  postId: string,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const alias = generateAlias() // your existing generator
    const { data } = await supabase
      .from('ghost_aliases')
      .select('alias')
      .eq('alias', alias)
      .eq('post_id', postId)
      .maybeSingle()

    if (!data) return alias

    // Exponential backoff: 50ms, 100ms, 200ms, 400ms
    await new Promise(r => setTimeout(r, 50 * 2 ** attempt))
  }
  throw new Error('Failed to generate unique alias after max attempts')
}
```

---

## Completion Checklist

- [ ] `lib/validators/vote.ts` created
- [ ] `lib/validators/feed.ts` created
- [ ] `lib/validators/expert.ts` created
- [ ] `lib/validators/ghost.ts` created
- [ ] `/api/votes/popular/route.ts` implemented
- [ ] `increment_popular_count` / `decrement_popular_count` SQL functions added
- [ ] `/api/seed` gated by `NODE_ENV`
- [ ] `/api/votes/helpful` uses Zod, no `as any`
- [ ] `/api/expert/review` admin gate in place
- [ ] Ghost alias retry uses backoff
- [ ] All routes return typed `NextResponse.json()` — no `as any` casts

# Agent: Type Safety Cleanup

**Role:** Eliminate all `as any` casts, generate typed Supabase client, enforce strict TypeScript throughout.  
**Works on:** `lib/`, `app/api/`, `types/`, `tsconfig.json`  
**Must not touch:** Database migrations, UI component layout

---

## Strategy Overview

1. Generate Supabase types from the live schema
2. Replace all `as any` casts with proper types
3. Create shared type files for API response shapes
4. Enable stricter `tsconfig` flags

---

## 1. Generate Supabase Database Types

Run once, commit output, re-run after every migration:

```bash
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_REF \
  --schema public \
  > types/supabase.ts
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_REF --schema public > types/supabase.ts"
  }
}
```

Add to CI (GitHub Actions):
```yaml
# .github/workflows/typecheck.yml
- name: Generate Supabase types
  run: npm run db:types
  env:
    SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 2. Typed Supabase Client Wrappers

```ts
// lib/supabase/server.ts  (update imports)
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* ... */ } }
  )
}
```

```ts
// lib/supabase/client.ts  (update imports)
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Once the `Database` generic is threaded through, all `.from('table')` calls become fully typed — no more `as any` needed for query results.

---

## 3. Shared API Response Types

```ts
// types/api.ts

import type { Database } from './supabase'

// Convenience row aliases
export type UserRow      = Database['public']['Tables']['users']['Row']
export type PostRow      = Database['public']['Tables']['posts']['Row']
export type CommentRow   = Database['public']['Tables']['comments']['Row']
export type VoteRow      = Database['public']['Tables']['reputation_votes']['Row']
export type AppRow       = Database['public']['Tables']['expert_applications']['Row']

// public_posts is a view — define manually until Supabase CLI exports views
export type PublicPost = {
  id:           string
  title:        string
  body:         string
  created_at:   string
  helpful_count: number
  popular_count: number
  is_ghost_post: boolean
  author_id:    string | null   // null when ghost post
  author_name:  string | null   // null when ghost post
  author_role:  string | null
  ghost_alias:  string | null   // set when ghost post
}

// API response shapes
export type FeedResponse = {
  posts:       PublicPost[]
  nextCursor:  string | null
  hasNextPage: boolean
}

export type VoteResponse = {
  voted: boolean
}

export type ErrorResponse = {
  error: string | Record<string, unknown>
}
```

---

## 4. tsconfig Hardening

```json
// tsconfig.json — add/update compilerOptions
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Note:** `noUncheckedIndexedAccess` will surface issues like `arr[0]` being `T | undefined`. Fix these — do not suppress with `!`.

---

## 5. Common `as any` Patterns and Their Fixes

### Pattern 1: Untyped query result
```ts
// Before
const { data } = await supabase.from('posts').select('*')
const posts = data as any[]

// After — types flow from Database generic
const { data: posts } = await supabase.from('posts').select('*')
// posts is PostRow[] | null — no cast needed
```

### Pattern 2: `req.json()` result
```ts
// Before
const body = await req.json() as any

// After — parse with Zod, use inferred type
const parsed = MySchema.safeParse(await req.json().catch(() => null))
if (!parsed.success) return ...
const body = parsed.data  // fully typed
```

### Pattern 3: `supabase.auth.getUser()` user object
```ts
// Before
const user = data.user as any
const role = user.app_metadata.role

// After
const { data: { user } } = await supabase.auth.getUser()
const role = user?.app_metadata?.role as string | undefined
// or use a typed helper:
function isAdmin(user: User | null): boolean {
  return user?.app_metadata?.role === 'admin'
}
```

### Pattern 4: RPC call result
```ts
// Before
await supabase.rpc('increment_popular_count', { post_id } as any)

// After — define RPC types in types/supabase.ts under Functions
// Then: supabase.rpc('increment_popular_count', { post_id }) is typed
```

---

## 6. Strict Null Handling Patterns

```ts
// Use nullish coalescing, never non-null assertion (!)
const count = data?.count ?? 0

// Narrow before using
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// user is non-null below this line

// Optional chaining for deep access
const alias = post?.ghost_aliases?.[0]?.alias ?? null
```

---

## 7. Automated Checks

```json
// package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint":      "next lint",
    "check":     "npm run typecheck && npm run lint"
  }
}
```

Add to GitHub Actions:
```yaml
- name: Type check
  run: npm run check
```

---

## Completion Checklist

- [ ] `npm run db:types` script added; `types/supabase.ts` generated and committed
- [ ] `lib/supabase/server.ts` and `client.ts` use `Database` generic
- [ ] `types/api.ts` created with `PublicPost`, `FeedResponse`, `VoteResponse`
- [ ] `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`
- [ ] All `as any` in `app/api/` replaced (search: `grep -rn "as any" app/api/`)
- [ ] All `as any` in `lib/` replaced
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] CI typecheck step added

# Architecture Decisions & Conventions

> Canonical reference for all contributors. When in doubt, check here first.

---

## Supabase Client Rules

| Context | Import from | When |
|---|---|---|
| Server Components, API Routes, Server Actions | `lib/supabase/server.ts` | Any code that runs on the server |
| Client Components (`'use client'`) | `lib/supabase/client.ts` | Browser-only interactions |

**Never** import from the wrong module. Next.js will not error — it will silently use stale cookies or crash at runtime.

### Why Two Clients?

- `server.ts` uses `@supabase/ssr` with `cookies()` from `next/headers` — reads the user's session from the HTTP request.
- `client.ts` uses `@supabase/ssr` with browser cookie storage — shares the session in the browser without SSR.

---

## Authentication Pattern

Every API route mutation must follow this pattern:

```ts
const supabase = createClient()
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Use user.id — never req.body.user_id or any client-supplied identity
```

**Never** trust `user_id` values from request bodies.

---

## Admin Authorization

Admin status lives in Supabase Auth **app_metadata** (server-set, not user-editable):

```ts
// CORRECT
if (user.app_metadata?.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// WRONG — users.role can be edited via client
if (userData.role !== 'admin') { ... }
```

---

## Ghost Post Invariant

The `public_posts` view nullifies `author_id`, `author_name`, and replaces them with `ghost_alias` when `is_ghost_post = true`.

**Rule:** The frontend and feed API always read from `public_posts`. Never query `posts` directly for display purposes.

---

## Validation Contract

All API routes that accept a body must:

1. Parse with `req.json().catch(() => null)`
2. Validate with a Zod schema in `lib/validators/`
3. Return `422` with `error.flatten()` on failure
4. Use the inferred Zod type — never cast the result

```ts
const body   = await req.json().catch(() => null)
const parsed = MySchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
}
const { field } = parsed.data  // typed
```

---

## Tailwind Dark Mode

Dark mode is class-based (`darkMode: 'class'` in `tailwind.config.ts`).

Every new UI element must include dark variants:

```tsx
// ✅ Correct
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

// ❌ Missing dark variants
<div className="bg-white text-gray-900">
```

---

## Pagination

The feed uses **cursor-based pagination**. Offset pagination (`?page=2`) is not supported.

- Cursor is a base64url-encoded JSON `{ created_at, id }`
- Encoded/decoded via `lib/pagination.ts`
- Frontend uses `useInfiniteQuery` with `getNextPageParam`

---

## Path Aliases

`@/` maps to the project root.

```ts
import { createClient } from '@/lib/supabase/server'
import type { PublicPost } from '@/types/api'
```

---

## File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Server components | `PascalCase` page files | `app/admin/page.tsx` |
| Client components | `PascalCase` in `components/` | `components/admin/ReviewActions.tsx` |
| API routes | `route.ts` in App Router dirs | `app/api/votes/helpful/route.ts` |
| Validators | `camelCase` domain name | `lib/validators/vote.ts` |
| Types | `camelCase` | `types/api.ts` |
| Migrations | `YYYYMMDD_description.sql` | `20240601_notifications.sql` |

---

## Error Response Shape

All API routes return errors in this shape:

```ts
// Validation error (422)
{ error: { formErrors: [], fieldErrors: { field: ['message'] } } }

// Auth error (401)
{ error: 'Unauthorized' }

// Permission error (403)
{ error: 'Forbidden' }

// Server error (500)
{ error: 'Description of what failed' }
```

---

## Comment Threading

Comments have a `depth` field capped at **5**. When creating a comment:

- If `parent_id` is provided, set `depth = parent.depth + 1`
- If `depth >= 5`, reject with `400 { error: 'Maximum reply depth reached' }`
- Threaded display nests by `parent_id`, sorted by `created_at ASC` within each level

---

## Reputation Votes Toggle Behavior

The `reputation_votes` table has a UNIQUE constraint on `(voter_id, target_id, vote_type)`.

Toggle logic:
1. Attempt `INSERT`
2. If `error.code === '23505'` (unique violation) → `DELETE` the existing row (vote off)
3. Sync `helpful_count` / `popular_count` via server-side RPC (not client-side arithmetic)

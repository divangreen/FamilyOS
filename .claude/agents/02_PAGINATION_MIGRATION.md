# Agent: Pagination Migration (Offset → Cursor)

**Role:** Replace offset-based pagination with cursor-based pagination throughout the feed system.  
**Works on:** `app/api/feed/`, `lib/validators/feed.ts`, feed UI components  
**Must not touch:** Auth logic, vote routes, admin routes

---

## Why This Matters

Offset pagination (`LIMIT n OFFSET m`) scans all preceding rows on every page. At 10k+ posts this degrades to full table scans. Cursor pagination uses `WHERE id < $cursor ORDER BY id DESC LIMIT n` — O(log n) via index.

---

## Cursor Strategy

Use a **composite cursor** encoding `(created_at, id)` to handle posts created in the same millisecond and to survive re-sorts.

**Cursor format:** base64-encoded JSON `{ "created_at": "ISO string", "id": "uuid" }`

```ts
// lib/pagination.ts

export type Cursor = { created_at: string; id: string }

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCursor(encoded: string): Cursor | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8')
    return JSON.parse(json) as Cursor
  } catch {
    return null
  }
}
```

---

## Updated Feed Query Schema

```ts
// lib/validators/feed.ts  (replace existing)
import { z } from 'zod'

export const FeedQuerySchema = z.object({
  cursor: z.string().optional(),      // base64url cursor, absent = first page
  limit:  z.coerce.number().int().min(1).max(50).default(20),
  role:   z.enum(['mom','dad','guardian','expert','admin']).optional(),
  search: z.string().max(200).optional(),
})

export type FeedQuery = z.infer<typeof FeedQuerySchema>
```

---

## Updated Feed API Route

```ts
// app/api/feed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FeedQuerySchema } from '@/lib/validators/feed'
import { decodeCursor, encodeCursor } from '@/lib/pagination'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const params   = Object.fromEntries(req.nextUrl.searchParams)
  const parsed   = FeedQuerySchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { cursor, limit, role, search } = parsed.data
  const decoded = cursor ? decodeCursor(cursor) : null

  let query = supabase
    .from('public_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id',         { ascending: false })
    .limit(limit + 1)  // fetch one extra to know if next page exists

  // Cursor condition
  if (decoded) {
    query = query.or(
      `created_at.lt.${decoded.created_at},` +
      `and(created_at.eq.${decoded.created_at},id.lt.${decoded.id})`
    )
  }

  // Role filter
  if (role) {
    query = query.eq('author_role', role)
  }

  // Full-text search (uses search_vector GIN index)
  if (search) {
    query = query.textSearch('search_vector', search, { type: 'websearch' })
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hasNextPage = data.length > limit
  const posts = hasNextPage ? data.slice(0, limit) : data

  const nextCursor = hasNextPage
    ? encodeCursor({
        created_at: posts[posts.length - 1].created_at,
        id:         posts[posts.length - 1].id,
      })
    : null

  return NextResponse.json({ posts, nextCursor, hasNextPage })
}
```

---

## Response Shape

```ts
// types/feed.ts
export interface FeedResponse {
  posts:       PublicPost[]
  nextCursor:  string | null
  hasNextPage: boolean
}
```

---

## Frontend Integration (React Query / SWR)

### With `@tanstack/react-query` (recommended)

```tsx
// hooks/useFeed.ts
import { useInfiniteQuery } from '@tanstack/react-query'
import type { FeedResponse } from '@/types/feed'

export function useFeed(filters: { role?: string; search?: string }) {
  return useInfiniteQuery<FeedResponse>({
    queryKey: ['feed', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (pageParam)      params.set('cursor', pageParam as string)
      if (filters.role)   params.set('role',   filters.role)
      if (filters.search) params.set('search', filters.search)
      const res = await fetch(`/api/feed?${params}`)
      if (!res.ok) throw new Error('Feed fetch failed')
      return res.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
  })
}
```

### Usage in a Server Component (RSC)

```tsx
// app/(feed)/page.tsx
import { createClient } from '@/lib/supabase/server'
import { decodeCursor } from '@/lib/pagination'

// Pass searchParams from Next.js page props into feed fetch
export default async function FeedPage({
  searchParams,
}: {
  searchParams: { cursor?: string; role?: string; search?: string }
}) {
  // ... call feed query directly (skipping API route for RSC)
}
```

---

## Migration Checklist

- [ ] `lib/pagination.ts` created with `encodeCursor` / `decodeCursor`
- [ ] `FeedQuerySchema` updated — `page`/`offset` params removed
- [ ] `/api/feed/route.ts` rewritten with cursor WHERE clause
- [ ] Response shape includes `nextCursor` and `hasNextPage`
- [ ] `useFeed` hook uses `useInfiniteQuery` with `getNextPageParam`
- [ ] "Load more" / infinite scroll trigger uses `fetchNextPage()`
- [ ] Old `?page=` URLs return 422 (not silently ignored)
- [ ] `public_posts` view has `created_at` and `id` in SELECT (required for cursor)

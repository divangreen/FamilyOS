# ParentCircle — Project Context

> Next.js 14 (App Router) · TypeScript · Supabase · Tailwind CSS

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Styling | Tailwind CSS (class-based dark mode) |
| Validation | Zod (target — not yet fully wired) |

---

## Database Schema (Key Tables)

### `users`
```sql
id          uuid PRIMARY KEY  -- matches auth.users.id
role        text              -- 'mom' | 'dad' | 'guardian' | 'expert' | 'admin'
is_verified_expert boolean
cred_score  integer
```

### `posts`
```sql
id             uuid PRIMARY KEY
author_id      uuid REFERENCES users(id)
is_ghost_post  boolean
helpful_count  integer
popular_count  integer
search_vector  tsvector  -- GIN index for FTS
title          text      -- trigram index (pg_trgm)
```

### `comments`
```sql
id        uuid PRIMARY KEY
post_id   uuid REFERENCES posts(id)
author_id uuid REFERENCES users(id)
parent_id uuid REFERENCES comments(id)  -- self-referential, NULL = root
depth     integer  -- 0–5 max
```

### `reputation_votes`
```sql
voter_id   uuid
target_id  uuid
vote_type  text  -- 'helpful' | 'popular'
UNIQUE(voter_id, target_id, vote_type)  -- toggle behavior
```

### `ghost_aliases`
```sql
user_id uuid
alias   text  -- e.g. "BraveOwl42"
post_id uuid  -- one alias per post
```

### `expert_applications`
```sql
user_id     uuid
status      text  -- 'pending' | 'approved' | 'rejected'
document_url text -- Supabase Storage path
```

### `public_posts` (view)
Joins `posts` with user/alias data. **Author identity nullified for ghost posts.**
Frontend always reads from this view — never the raw `posts` table.

---

## API Routes (`app/api/`)

| Route | Method | Description |
|---|---|---|
| `/api/feed` | GET | Paginated + filtered post feed |
| `/api/ghost/alias` | POST | Create ghost alias |
| `/api/votes/helpful` | POST | Toggle helpful vote |
| `/api/votes/popular` | POST | ⚠️ **NOT YET IMPLEMENTED** |
| `/api/expert/apply` | POST | Submit expert application + file upload |
| `/api/expert/review` | PATCH | Admin approve/reject application |
| `/api/seed` | POST | Dev-only seed data ⚠️ not production-gated |

---

## Architecture Rules

1. **Server components** → `lib/supabase/server.ts` only
2. **Client components** → `lib/supabase/client.ts` only
3. Never cross-import between server and client Supabase instances
4. All mutations authenticate via `supabase.auth.getUser()` — never trust client-supplied user IDs
5. Admin checks: `user.app_metadata.role === 'admin'` (server-set, not user-table)
6. Path alias `@/` maps to project root
7. All UI must include `dark:` Tailwind variants

---

## Known Gaps (Backlog)

| Gap | Priority | Notes |
|---|---|---|
| `/api/votes/popular` missing | High | `popular_count` never incremented |
| Admin dashboard UI (`/app/admin/`) | High | No UI exists |
| Notifications system | Medium | No schema or routes |
| Seed route not production-gated | High | Security risk |
| `as any` casts throughout | Medium | Replace with Zod + typed returns |
| No Zod validation on API routes | High | All inputs unvalidated |
| Ghost alias retry lacks backoff | Low | Collision retry is tight loop |
| Offset pagination → cursor-based | Medium | Performance at scale |

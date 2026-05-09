markdown# The Village — Agent Instructions

You are a multi-role engineering agent working on The Village, a Next.js 14
community platform for parents. Stack: Next.js 14 (App Router), TypeScript,
Supabase (PostgreSQL + Auth + Storage), Tailwind CSS.

---

## Agent 1 — Auth & Privacy Agent

**Scope:** Authentication, ghost posting anonymity, RLS policies, session
management, middleware.

**Core rules:**

- `public_posts` view must NEVER expose `author_id` or `display_name` when
  `is_ghost_post = true`. Treat any leak as a critical bug.
- Ghost alias lookups in `ReplyForm.tsx` and `NewPostForm.tsx` have a race
  condition — always await alias UUID resolution before allowing submit.
- RLS policies live in `supabase/migrations/`. Never bypass via service role
  unless in a server-side admin-only route.
- Admin checks must use `user.app_metadata.role === 'admin'` (set server-side),
  never `user.user_metadata` (spoofable by clients).
- Middleware in `middleware.ts` must refresh the session on every request via
  `supabase.auth.getUser()`.

**Key files:** `middleware.ts`, `app/api/ghost/alias/route.ts`, `lib/ghost.ts`,
`lib/supabase/server.ts`, `lib/supabase/client.ts`,
`supabase/migrations/001_initial.sql`

---

## Agent 2 — Database & Schema Agent

**Scope:** Supabase schema migrations, views, RPCs, indexes, triggers.

**Core rules:**

- All schema changes go in a new numbered migration file under
  `supabase/migrations/`. Never edit `001_initial.sql` directly.
- The `public_posts` view must be updated whenever `posts`, `users`,
  `ghost_aliases`, or `sub_villages` changes.
- The `adjust_helpful_count` RPC uses `SECURITY DEFINER` — audit any changes
  carefully for privilege escalation.
- Before adding a new table, check if an existing table + column extension
  covers the need.
- New tables need: UUID PK with `gen_random_uuid()`, `created_at` + `updated_at`
  timestamps, `set_updated_at` trigger, RLS enabled, and at least a basic
  select policy.
- The schema already has FTS (`search_vector` tsvector column + GIN index) and
  trigram index on `posts.title` — expose these before adding new search
  infrastructure.

**Key files:** `supabase/migrations/001_initial.sql`, `lib/supabase/types.ts`,
`app/api/votes/helpful/route.ts`, `app/api/expert/review/route.ts`

---

## Agent 3 — API & Backend Agent

**Scope:** All Next.js API routes under `app/api/`, data fetching patterns,
TypeScript safety on Supabase calls.

**Core rules:**

- Remove all `as any` casts on Supabase queries. Use typed clients via
  `createClient<Database>()` and extend `lib/supabase/types.ts` to cover views
  and RPCs properly.
- API routes must authenticate via `supabase.auth.getUser()` before any
  mutation. Never trust client-supplied user IDs.
- The `popular` vote type exists in the DB enum and `VoteType` type but has no
  API route — implement `/api/votes/popular` mirroring the helpful vote toggle
  pattern.
- All routes must return typed `NextResponse.json()` with consistent error
  shapes: `{ error: string }` on failure, data object on success.
- File uploads in `/api/expert/apply` go to the `expert-documents` Supabase
  Storage bucket via service role — validate MIME type and size server-side
  before upload.
- Signed URLs for expert documents expire in 7 days — regenerate them on admin
  review if they've expired.

**Key files:** `app/api/feed/route.ts`, `app/api/votes/helpful/route.ts`,
`app/api/ghost/alias/route.ts`, `app/api/expert/apply/route.ts`,
`app/api/expert/review/route.ts`, `app/api/seed/route.ts`

---

## Agent 4 — Feed & Discovery Agent

**Scope:** Feed page, filtering, sorting, search, pagination, sub-village pages.

**Core rules:**

- Feed queries must always go through the `public_posts` view, never the raw
  `posts` table — this is what enforces ghost post anonymity on the frontend.
- The schema has a working FTS index (`search_vector` GIN) and trigram index on
  `posts.title` — use these for search via `.textSearch()` or `.ilike()` before
  building anything custom.
- Current offset-based pagination (`range(offset, offset + pageSize - 1)`)
  should be migrated to cursor-based (keyset on `created_at` + `id`) for
  infinite scroll.
- Role filter must also set `.eq('is_ghost_post', false)` — ghost posts have
  null role and should never appear in role-filtered views.
- `FeedFilters.tsx` is a client component that uses `useSearchParams` — it must
  remain wrapped in `<Suspense>` in the feed page.

**Key files:** `app/feed/page.tsx`, `components/FeedFilters.tsx`,
`components/PostCard.tsx`, `app/api/feed/route.ts`

---

## Agent 5 — Admin Dashboard Agent

**Scope:** Admin-only UI and routes for expert application review and content
moderation.

**Core rules:**

- The review endpoint `PATCH /api/expert/review` already exists and is
  admin-gated via `app_metadata.role`. Build the UI against this — do not
  rebuild the backend.
- Admin pages must be under `app/admin/` and protected in `middleware.ts` by
  checking `user.app_metadata.role === 'admin'`.
- Expert application list must show: applicant display name, specialty,
  submitted date, current status, and a link to the signed document URL.
- Signed document URLs expire — check `reviewed_at` vs URL age and regenerate
  via service role if stale before displaying.
- Approval flow: PATCH with `decision: 'approved'` triggers the DB update that
  sets `users.is_verified_expert = true` and `users.role = 'expert'` — confirm
  this in the UI with a success state.
- Rejection flow: require `reviewer_notes` before allowing submission.

**Key files:** `app/api/expert/review/route.ts`, `app/apply-expert/page.tsx`,
`middleware.ts`, `lib/supabase/types.ts`

---

## Agent 6 — Notifications Agent

**Scope:** Notification system — schema, triggers, API, and bell UI.

**Core rules:**

- Create a `notifications` table with: `id`, `user_id` (recipient),
  `actor_id` (who triggered it), `type` (enum: `reply_post`, `reply_comment`,
  `helpful_vote`, `expert_approved`, `expert_rejected`), `target_id`,
  `target_type` (`post` | `comment`), `read` (bool, default false),
  `created_at`.
- Notification fanout can happen in API routes (after insert/vote) or via
  Supabase DB triggers — prefer API-side for now to avoid SECURITY DEFINER
  complexity.
- Never notify a user of their own actions (actor_id = user_id → skip).
- The bell icon in the feed header should show unread count; mark as read on
  click/view.
- Ghost posts: notifications for replies to ghost posts should still deliver
  to the real author, but the notification copy should not reveal the ghost
  alias context to third parties.

**Key files:** `app/feed/page.tsx`, `app/post/[id]/ReplyForm.tsx`,
`app/api/votes/helpful/route.ts`, `supabase/migrations/001_initial.sql`

---

## Agent 7 — QA & Type Safety Agent

**Scope:** TypeScript correctness, input validation, error boundaries, testing.

**Core rules:**

- All `as any` casts in API routes are tech debt — replace with proper
  types. Extend `Database` in `lib/supabase/types.ts` to include views
  (`public_posts`) and functions (`adjust_helpful_count`) with correct arg/
  return types.
- All API route inputs must be validated with Zod before use. Install `zod`
  (already a dev dep via eslint-plugin-react-hooks) and create a
  `lib/validators.ts`.
- Comment depth is enforced by DB constraint (`CHECK (depth BETWEEN 0 AND 5)`)
  but not on the client — add client-side guard in `ReplyForm.tsx`.
- The `popular_count` column exists and is incremented nowhere — either wire it
  up or remove it to avoid confusion.
- Ghost alias generation in `lib/ghost.ts` retries 5 times on unique constraint
  violation — add exponential backoff and surface a proper error if exhausted.
- The seed route `app/api/seed/route.ts` should be disabled in production
  (check `process.env.NODE_ENV !== 'development'` at the top).

**Key files:** `lib/supabase/types.ts`, `app/api/votes/helpful/route.ts`,
`app/api/expert/apply/route.ts`, `app/post/[id]/ReplyForm.tsx`,
`app/post/new/NewPostForm.tsx`, `lib/ghost.ts`

---

## Global rules (apply to all agents)

- Never query the raw `posts` table from the frontend — always use
  `public_posts` view.
- Server components use `lib/supabase/server.ts` (`createClient`). Client
  components use `lib/supabase/client.ts`. Never import server client in a
  `'use client'` file.
- All mutations require the user to be authenticated. Check with
  `supabase.auth.getUser()` — never trust `session` alone.
- Path alias `@/` maps to the project root per `tsconfig.json`.
- Tailwind only — no CSS-in-JS, no inline `style` objects except for dynamic
  values that can't be expressed as Tailwind classes.
- Dark mode is `class`-based per `tailwind.config.ts`. Every new UI element
  needs `dark:` variants.

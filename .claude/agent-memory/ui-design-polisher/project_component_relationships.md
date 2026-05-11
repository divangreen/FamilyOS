---
name: Village Component Visual Relationships
description: Which components share visual responsibilities and must stay in sync after the 2026-05-11 theme overhaul
type: project
---

## Card surface pattern (must stay in sync)

`PostCard` and `CommentCard` share the same card idiom post-overhaul:
- PostCard: `bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow`
- CommentCard: uses `border-l-4` left-accent with role-tinted bg — no outer card border

`RoleBadge` is the single source of truth for role colors. It is used inside:
- `PostCard` (author row)
- `app/post/[id]/page.tsx` (post header)
- `CommentCard` duplicates the badge style inline (not via RoleBadge component) — **these two must stay in sync** when role colors change.

## Ghost post visual identity (must stay in sync across three components)

- `GhostToggle` — compose-time toggle (uses violet ghost palette)
- `PostCard` — ghost posts: `border-l-4 border-l-violet-400` on the card
- `CommentCard` — ghost comments: `border-l-violet-400 border-dashed` + `bg-violet-50/30`
- Ghost badge: `bg-violet-50 text-violet-700 border border-violet-200 rounded-full`

## Filter pill / vote button harmony

`FeedFilters` active pill (`bg-emerald-800 text-white`) must visually match the active vote state in `PostCard` (`text-emerald-800` heart). Both signal "selected/active" with the same emerald accent.

## Layout wiring

- `Sidebar` is wired as `lg:block w-72 shrink-0 aside` inside `app/feed/page.tsx`. Uses placeholder expert/activity data — wire to real Supabase queries when available.
- `app/(auth)/layout.tsx` controls the auth page background (`bg-slate-50`) — change background there, not in individual login/signup page files.
- `app/layout.tsx` body class: `bg-slate-50 text-slate-900` (no dark mode body class post-overhaul).

## Pages that share the same header pattern

Both `app/feed/page.tsx` and `app/post/[id]/page.tsx` use: `bg-white border-b border-slate-200 sticky top-0 z-20` for their top bar. If you update one, check the other.

## Sub-village tag pattern

Appears in both `PostCard` and `app/post/[id]/page.tsx` header: `bg-slate-100 text-slate-600 rounded-full text-xs px-2 py-0.5`. Must stay consistent.

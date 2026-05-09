---
name: Village Component Visual Relationships
description: Which components share visual responsibilities and must stay in sync
type: project
---

Components that render user-generated content cards must share the same surface style:
- `PostCard` and `CommentCard` use the same card surface (`--bg-surface`, `--border`, `rounded-xl`)
- `RoleBadge` is used inside both `PostCard` and `app/post/[id]/page.tsx` — its color table is the single source of truth for role colors

Ghost post visual identity flows through three components:
- `GhostToggle` — the compose-time toggle (plum callout card when active)
- `PostCard` — ghost posts get `border-l-4 border-l-[var(--ghost-accent)]`
- `CommentCard` — ghost comments get dashed plum left border + faint ghost-bg tint

`FeedFilters` pill active state must visually match the `PostCard` vote button active state (both use `--accent` terracotta).

`Sidebar` is wired into `app/feed/page.tsx` as a `lg:` breakpoint aside column. It uses placeholder data for experts and activity — wire to real Supabase queries when available.

`app/(auth)/layout.tsx` wraps both login and signup pages — changes to the auth background must be made there, not in individual page files.

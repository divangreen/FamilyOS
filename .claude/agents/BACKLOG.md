# Backlog & Gap Tracker

Track all known gaps from the initial project audit. Update this file as items are resolved.

---

## Critical (Security / Data Integrity)

### GAP-001 — Seed route not production-gated
- **Risk:** `/api/seed` wipes and re-populates data in any environment
- **Fix:** Add `if (process.env.NODE_ENV === 'production') return 403` at handler top
- **Agent:** 01_API_HARDENING
- **Status:** ☐ Open

### GAP-002 — No input validation on API routes
- **Risk:** Malformed UUIDs, oversized strings, and type mismatches hit the database unfiltered
- **Fix:** Add Zod schemas in `lib/validators/`; parse every route body and query string
- **Agent:** 01_API_HARDENING
- **Status:** ☐ Open

### GAP-003 — `as any` casts suppress type errors
- **Risk:** Runtime crashes from untyped data; silences TypeScript's safety net
- **Fix:** Generate `types/supabase.ts`; thread `Database` generic through both clients
- **Agent:** 05_TYPE_SAFETY
- **Status:** ☐ Open

---

## High (Missing Features)

### GAP-004 — `/api/votes/popular` not implemented
- **Risk:** `popular_count` is always 0; the popular vote UI does nothing
- **Fix:** Implement route mirroring the helpful route; add `increment_popular_count` RPC
- **Agent:** 01_API_HARDENING
- **Status:** ☐ Open

### GAP-005 — Admin dashboard UI missing
- **Risk:** Admins have no interface to review expert applications
- **Fix:** Build `/app/admin/` with layout, overview, applications list, review page
- **Agent:** 03_ADMIN_DASHBOARD
- **Status:** ☐ Open

### GAP-006 — No notifications system
- **Risk:** Users get no feedback when their posts are voted on, commented on, or expert status changes
- **Fix:** Add `notifications` table + RLS + API routes + bell component
- **Agent:** 04_NOTIFICATIONS
- **Status:** ☐ Open

---

## Medium (Performance / UX)

### GAP-007 — Offset pagination not scalable
- **Risk:** At 10k+ posts, page 50 scans 1000 rows before returning 20
- **Fix:** Migrate `/api/feed` to cursor-based pagination using `(created_at, id)` composite cursor
- **Agent:** 02_PAGINATION_MIGRATION
- **Status:** ☐ Open

---

## Low (Polish)

### GAP-008 — Ghost alias retry lacks backoff
- **Risk:** On collision, tight retry loop hammers the database
- **Fix:** Add exponential backoff with `setTimeout(50 * 2^attempt)`; cap at 5 attempts
- **Agent:** 01_API_HARDENING
- **Status:** ☐ Open

---

## Resolved

_Move items here when complete, with PR reference and date._

| GAP | Description | PR | Date |
|---|---|---|---|
| — | — | — | — |

---

## How to Update This File

When you resolve a gap:
1. Change `☐ Open` → `✅ Resolved`
2. Copy the row to the **Resolved** table with PR number and date
3. Commit alongside the fix PR

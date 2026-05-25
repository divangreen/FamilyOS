# ParentCircle — Agents Overview

This document lists every agent in the project, their ownership, dependencies, and recommended execution order.

---

## Agent Roster

### Foundation Agents

| # | Agent | File | Touches |
|---|---|---|---|
| 0 | **CTO Orchestrator** | `agents/00_CTO.md` | All agents, BACKLOG, decisions |
| 1 | **API Hardening** | `agents/01_API_HARDENING.md` | `app/api/`, `lib/validators/` |
| 2 | **Pagination Migration** | `agents/02_PAGINATION_MIGRATION.md` | `app/api/feed/`, feed hooks |
| 3 | **Admin Dashboard** | `agents/03_ADMIN_DASHBOARD.md` | `app/admin/`, `components/admin/` |
| 4 | **Notifications** | `agents/04_NOTIFICATIONS.md` | `supabase/migrations/`, `app/api/notifications/` |
| 5 | **Type Safety** | `agents/05_TYPE_SAFETY.md` | `types/`, `lib/`, `tsconfig.json` |

### AI Feature Agents

| # | Agent | File | Feature |
|---|---|---|---|
| AI-0 | **AI Strategy** | `agents/AI_INTEGRATION_STRATEGY.md` | Shared infra: `lib/ai/claude.ts`, `lib/ai/safety.ts`, pgvector |
| 6 | **Postpartum Coach** | `agents/06_AI_POSTPARTUM_COACH.md` | CBT chatbot, crisis detection, session history |
| 7 | **Cry Interpreter** | `agents/07_AI_CRY_INTERPRETER.md` | Browser audio → Claude → probable cause |
| 8 | **Routine Builder** | `agents/08_AI_ROUTINE_BUILDER.md` | Age-appropriate daily schedule generator |
| 9 | **Pediatric Assistant** | `agents/09-11_AI_FEATURES.md` | RAG over expert posts, pgvector similarity |
| 10 | **Feed Ranker** | `agents/09-11_AI_FEATURES.md` | Batch AI quality scoring, `ai_rank_score` |
| 11 | **Content Moderation** | `agents/09-11_AI_FEATURES.md` | Pre-publish safety screening |

---

## Full Execution Order

```
Phase 1 — Foundation
  5 (Type Safety)
      ↓
  1 (API Hardening)
      ↓
  2 (Pagination) + 4 (Notifications)  ← parallel
      ↓
  3 (Admin Dashboard)

Phase 2 — AI Infrastructure
  AI-0: lib/ai/claude.ts + lib/ai/safety.ts + pgvector migration
      ↓
  11 (Moderation)  ← must exist before any new post creation
      ↓
  6 (Coach) + 8 (Routine) + 10 (Feed Ranker)  ← parallel
      ↓
  7 (Cry Interpreter)
      ↓
  9 (Pediatric Assistant)  ← needs embeddings pipeline running
```

---

## Shared Files

```
lib/
  ai/
    claude.ts           ← AI-0: shared Claude API wrapper
    safety.ts           ← AI-0: disclaimer + crisis detection
    moderation.ts       ← Agent 11: moderateContent()
    rag.ts              ← Agent 09: retrieveRelevantPosts()
    embeddings.ts       ← Agent 09: embedPost()
    prompts/
      coach.ts          ← Agent 06
  validators/
    vote.ts feed.ts expert.ts ghost.ts   ← Agent 01
  pagination.ts         ← Agent 02
  notifications.ts      ← Agent 04

types/
  supabase.ts           ← Agent 05 (generated)
  api.ts                ← Agent 05

supabase/migrations/
  add_popular_count_rpc.sql         ← Agent 01
  20240601_notifications.sql        ← Agent 04
  enable_pgvector.sql               ← AI-0
  ai_coach_sessions.sql             ← Agent 06
  saved_routines.sql                ← Agent 08
  moderation_columns.sql            ← Agent 11
  match_posts_rpc.sql               ← Agent 09

app/api/ai/
  chat/route.ts         ← Agent 06
  cry/route.ts          ← Agent 07
  routine/route.ts      ← Agent 08
  ask/route.ts          ← Agent 09
  rank/route.ts         ← Agent 10
```

---

## Gap Tracker (Full)

| ID | Gap | Severity | Agent | Status |
|---|---|---|---|---|
| GAP-001 | Seed route not production-gated | 🔴 Critical | 01 | ☐ |
| GAP-002 | No Zod validation on API routes | 🔴 Critical | 01 | ☐ |
| GAP-003 | `as any` casts throughout | 🟠 High | 05 | ☐ |
| GAP-004 | `/api/votes/popular` not implemented | 🟠 High | 01 | ☐ |
| GAP-005 | Admin dashboard missing | 🟠 High | 03 | ☐ |
| GAP-006 | No notifications | 🟡 Medium | 04 | ☐ |
| GAP-007 | Offset pagination | 🟡 Medium | 02 | ☐ |
| GAP-008 | Ghost alias no backoff | 🟢 Low | 01 | ☐ |
| GAP-009 | No AI content moderation | 🟠 High | 11 | ☐ |
| GAP-010 | No parental mental health support | 🟠 High | 06 | ☐ |
| GAP-011 | Feed ranking is vote-count only | 🟡 Medium | 10 | ☐ |
| GAP-012 | No expert post RAG / Q&A | 🟡 Medium | 09 | ☐ |

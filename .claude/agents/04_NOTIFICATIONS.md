# Agent: Notifications System

**Role:** Design and implement an in-app notification system from schema to UI.  
**Works on:** `supabase/migrations/`, `app/api/notifications/`, `components/notifications/`  
**Depends on:** Auth (users table), posts, comments, reputation_votes tables

---

## Notification Types

| Type | Trigger | Recipient |
|---|---|---|
| `comment_reply` | Someone replies to your comment | Comment author |
| `post_comment` | Someone comments on your post | Post author |
| `helpful_vote` | Someone marks your post helpful | Post author |
| `popular_vote` | Someone marks your post popular | Post author |
| `expert_approved` | Admin approves expert application | Applicant |
| `expert_rejected` | Admin rejects expert application | Applicant |

---

## 1. Database Migration

```sql
-- supabase/migrations/20240601_notifications.sql

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  -- type: 'comment_reply' | 'post_comment' | 'helpful_vote'
  --        | 'popular_vote' | 'expert_approved' | 'expert_rejected'
  is_read     boolean NOT NULL DEFAULT false,
  actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  -- actor = the person who triggered the notification (null for system events)
  resource_type text,   -- 'post' | 'comment' | 'application'
  resource_id   uuid,   -- the relevant post/comment/application id
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching a user's unread notifications quickly
CREATE INDEX notifications_user_unread_idx
  ON notifications(user_id, is_read, created_at DESC);

-- RLS: users can only read their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (true);  -- only service role inserts
```

---

## 2. Notification Helpers

```ts
// lib/notifications.ts
import { createClient } from '@/lib/supabase/server'

type NotificationPayload = {
  user_id:       string
  type:          string
  actor_id?:     string
  resource_type?: string
  resource_id?:  string
  metadata?:     Record<string, unknown>
}

export async function createNotification(payload: NotificationPayload) {
  const supabase = createClient()
  const { error } = await supabase.from('notifications').insert(payload)
  if (error) console.error('[notifications] insert failed:', error.message)
}
```

---

## 3. Wire Notifications into Existing Routes

### In `/api/votes/helpful` — notify post author
```ts
// After successful vote insert:
const { data: post } = await supabase
  .from('posts')
  .select('author_id')
  .eq('id', post_id)
  .single()

if (post && post.author_id !== user.id) {
  await createNotification({
    user_id:       post.author_id,
    type:          'helpful_vote',
    actor_id:      user.id,
    resource_type: 'post',
    resource_id:   post_id,
  })
}
```

### In comment creation — notify post author + parent comment author
```ts
// After comment insert:
// 1. Notify post author (if different from commenter)
if (post.author_id !== user.id) {
  await createNotification({
    user_id: post.author_id, type: 'post_comment',
    actor_id: user.id, resource_type: 'comment', resource_id: comment.id,
  })
}
// 2. Notify parent comment author (if it's a reply and different user)
if (parent_id && parentComment.author_id !== user.id) {
  await createNotification({
    user_id: parentComment.author_id, type: 'comment_reply',
    actor_id: user.id, resource_type: 'comment', resource_id: comment.id,
  })
}
```

### In `/api/expert/review` — notify applicant
```ts
await createNotification({
  user_id:       application.user_id,
  type:          decision === 'approved' ? 'expert_approved' : 'expert_rejected',
  resource_type: 'application',
  resource_id:   application_id,
  metadata:      { reviewer_note: reviewer_note ?? null },
})
```

---

## 4. Notifications API Routes

### GET `/api/notifications` — fetch paginated notifications
```ts
// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = 20
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return NextResponse.json({ notifications, unreadCount })
}
```

### PATCH `/api/notifications/read` — mark as read
```ts
// app/api/notifications/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  ids: z.array(z.string().uuid()).optional(), // absent = mark ALL read
})

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)

  if (parsed.data.ids?.length) {
    query = query.in('id', parsed.data.ids)
  }

  await query
  return NextResponse.json({ ok: true })
}
```

---

## 5. Notification Bell Component

```tsx
// components/notifications/NotificationBell.tsx
'use client'
import { useEffect, useState } from 'react'

type Notification = {
  id: string
  type: string
  is_read: boolean
  created_at: string
  metadata: Record<string, unknown>
}

export function NotificationBell() {
  const [unread, setUnread]       = useState(0)
  const [open, setOpen]           = useState(false)
  const [items, setItems]         = useState<Notification[]>([])

  async function load() {
    const res  = await fetch('/api/notifications')
    const data = await res.json()
    setItems(data.notifications ?? [])
    setUnread(data.unreadCount ?? 0)
  }

  useEffect(() => { load() }, [])

  async function markAllRead() {
    await fetch('/api/notifications/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setUnread(0)
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) load() }}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {items.length === 0 && (
              <li className="px-4 py-6 text-sm text-center text-gray-400">No notifications yet.</li>
            )}
            {items.map((n) => (
              <li key={n.id} className={`px-4 py-3 text-sm ${n.is_read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
                <NotificationLabel type={n.type} />
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function NotificationLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    comment_reply:    'Someone replied to your comment',
    post_comment:     'New comment on your post',
    helpful_vote:     'Your post was marked helpful',
    popular_vote:     'Your post was marked popular',
    expert_approved:  '✅ Your expert application was approved',
    expert_rejected:  'Your expert application was not approved',
  }
  return <p>{labels[type] ?? type}</p>
}
```

---

## Completion Checklist

- [ ] `supabase/migrations/20240601_notifications.sql` — table + RLS policies
- [ ] `lib/notifications.ts` — `createNotification` helper
- [ ] `/api/notifications` GET route
- [ ] `/api/notifications/read` PATCH route
- [ ] `helpful` vote route calls `createNotification`
- [ ] `popular` vote route calls `createNotification`
- [ ] Comment creation calls `createNotification` for post author + parent commenter
- [ ] Expert review PATCH calls `createNotification`
- [ ] `NotificationBell` component with unread badge
- [ ] `NotificationBell` added to app header/navbar
- [ ] Dark mode variants on all notification UI

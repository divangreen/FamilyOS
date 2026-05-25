# Agent: Admin Dashboard UI

**Role:** Build `/app/admin/` — the admin dashboard for expert application review and platform moderation.  
**Works on:** `app/admin/**`, `components/admin/**`  
**Auth requirement:** All pages and API calls must verify `app_metadata.role === 'admin'` server-side

---

## Route Map

```
app/admin/
├── layout.tsx          ← admin shell + sidebar nav
├── page.tsx            ← overview / stats
├── applications/
│   ├── page.tsx        ← list pending expert applications
│   └── [id]/
│       └── page.tsx    ← review a single application
├── users/
│   └── page.tsx        ← user list + cred_score viewer
└── posts/
    └── page.tsx        ← flagged post moderation queue
```

---

## 1. Admin Layout with Auth Guard

```tsx
// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'admin') {
    redirect('/') // or redirect('/unauthorized')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
```

---

## 2. Admin Sidebar Component

```tsx
// components/admin/AdminSidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin',               label: 'Overview' },
  { href: '/admin/applications',  label: 'Expert Applications' },
  { href: '/admin/users',         label: 'Users' },
  { href: '/admin/posts',         label: 'Flagged Posts' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col gap-1 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Admin
      </p>
      {NAV.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`
            px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${pathname === href
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
          `}
        >
          {label}
        </Link>
      ))}
    </aside>
  )
}
```

---

## 3. Overview Page

```tsx
// app/admin/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  const supabase = createClient()

  const [
    { count: pendingApps },
    { count: totalUsers },
    { count: totalPosts },
  ] = await Promise.all([
    supabase.from('expert_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Pending Applications', value: pendingApps ?? 0, accent: 'text-amber-600 dark:text-amber-400' },
    { label: 'Total Users',          value: totalUsers ?? 0,  accent: 'text-blue-600 dark:text-blue-400' },
    { label: 'Total Posts',          value: totalPosts ?? 0,  accent: 'text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, accent }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-4xl font-bold mt-1 ${accent}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 4. Expert Applications List

```tsx
// app/admin/applications/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ApplicationsPage() {
  const supabase = createClient()
  const { data: apps } = await supabase
    .from('expert_applications')
    .select('id, status, created_at, users(id, role)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Pending Expert Applications
      </h1>
      {!apps?.length && (
        <p className="text-gray-500 dark:text-gray-400">No pending applications.</p>
      )}
      <ul className="space-y-3">
        {apps?.map((app) => (
          <li
            key={app.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                {app.id}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Submitted {new Date(app.created_at).toLocaleDateString()}
              </p>
            </div>
            <Link
              href={`/admin/applications/${app.id}`}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Review →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 5. Application Review Page

```tsx
// app/admin/applications/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReviewActions } from '@/components/admin/ReviewActions'

export default async function ReviewApplicationPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: app } = await supabase
    .from('expert_applications')
    .select('*, users(id, role, cred_score)')
    .eq('id', params.id)
    .single()

  if (!app) notFound()

  // Get a signed URL for the uploaded credential document
  const { data: signedUrl } = await supabase.storage
    .from('expert-docs')
    .createSignedUrl(app.document_url, 600) // 10 min expiry

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Review Application
      </h1>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6 space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Application ID: <span className="font-mono">{app.id}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Status: <span className="font-semibold capitalize">{app.status}</span>
        </p>
        {signedUrl?.signedUrl && (
          <a
            href={signedUrl.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View Credential Document ↗
          </a>
        )}
      </section>

      {app.status === 'pending' && (
        <ReviewActions applicationId={app.id} />
      )}
    </div>
  )
}
```

---

## 6. Review Actions Client Component

```tsx
// components/admin/ReviewActions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ReviewActions({ applicationId }: { applicationId: string }) {
  const router  = useRouter()
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)

  async function submit(decision: 'approved' | 'rejected') {
    setLoading(decision)
    const res = await fetch('/api/expert/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: applicationId,
        decision,
        reviewer_note: note || undefined,
      }),
    })
    setLoading(null)
    if (res.ok) router.push('/admin/applications')
  }

  return (
    <div className="space-y-4">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reviewer note (optional)"
        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-3 text-sm resize-none"
        rows={3}
      />
      <div className="flex gap-3">
        <button
          onClick={() => submit('approved')}
          disabled={!!loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === 'approved' ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={() => submit('rejected')}
          disabled={!!loading}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {loading === 'rejected' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  )
}
```

---

## Completion Checklist

- [ ] `app/admin/layout.tsx` — admin auth guard redirects non-admins
- [ ] `app/admin/page.tsx` — stats overview
- [ ] `app/admin/applications/page.tsx` — pending list
- [ ] `app/admin/applications/[id]/page.tsx` — review + signed doc URL
- [ ] `components/admin/AdminSidebar.tsx`
- [ ] `components/admin/ReviewActions.tsx` — approve/reject with note
- [ ] All components have `dark:` Tailwind variants
- [ ] Admin layout does NOT use client-side auth — server `getUser()` only

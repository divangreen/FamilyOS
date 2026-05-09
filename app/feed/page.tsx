import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { FeedFilters } from '@/components/FeedFilters'
import { PostCard } from '@/components/PostCard'
import Sidebar from '@/components/Sidebar'
import type { UserRole, PublicPost } from '@/lib/supabase/types'

const PAGE_SIZE = 20

interface FeedPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const role       = (typeof params.role       === 'string' ? params.role       : null) as UserRole | null
  const sort       =  typeof params.sort       === 'string' ? params.sort       : 'recent'
  const subVillage =  typeof params.subVillage === 'string' ? params.subVillage : null
  const page       =  Math.max(0, parseInt(typeof params.page === 'string' ? params.page : '0', 10))

  // Derive user initials for compose bar avatar
  const displayName: string = (user?.user_metadata?.display_name as string | undefined) ?? ''
  const userInitials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  // Fetch sub-villages for filter
  const { data: subVillages } = await supabase
    .from('sub_villages')
    .select('id, name')
    .order('name')

  // Query public_posts view — never the raw posts table
  let query = supabase.from('public_posts').select('*', { count: 'exact' })

  if (role && role !== ('all' as string)) {
    query = query.eq('role', role).eq('is_ghost_post', false)
  }
  if (subVillage) {
    query = query.eq('sub_village_id', subVillage)
  }
  if (sort === 'helpful') {
    query = query.order('helpful_count', { ascending: false })
  } else if (sort === 'popular') {
    query = query.order('popular_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  const { data: posts, count, error } = await query

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">

      {/* Sticky header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1
              className="text-2xl font-bold text-[var(--earth)] leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              The Village
            </h1>
            <p className="text-[var(--clay)] text-xs tracking-widest uppercase ui-sans">
              A space for parents
            </p>
          </div>

          <nav className="flex gap-2" aria-label="User actions">
            {user ? (
              <>
                <Link
                  href="/apply-expert"
                  className="px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent-soft)] rounded-lg transition text-sm ui-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  Apply as Expert
                </Link>
                <Link
                  href="/post/new"
                  className="px-3 py-1.5 bg-[var(--accent)] text-white hover:bg-[var(--clay)] rounded-lg transition text-sm ui-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  + New Post
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-[var(--accent)] text-white hover:bg-[var(--clay)] rounded-lg transition text-sm ui-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Two-column layout: feed + sidebar */}
      <div className="max-w-5xl mx-auto px-4 flex gap-6 py-6">

        {/* Main feed column */}
        <main className="flex-1 min-w-0">

          {/* Compose bar — only shown when logged in */}
          {user && (
            <Link
              href="/post/new"
              className="flex items-center gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--accent)] rounded-xl mb-4 cursor-pointer hover:border-[var(--clay)] transition-colors group"
              aria-label="Create a new post"
            >
              {/* User avatar */}
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold ui-sans shrink-0">
                {userInitials}
              </div>
              <span className="text-[var(--text-muted)] text-sm flex-1 font-serif group-hover:text-[var(--text-secondary)] transition-colors">
                Share something with the village...
              </span>
              <span className="text-xs text-[var(--ghost-accent)] bg-[var(--ghost-pearl)] px-2 py-1 rounded-full ui-sans shrink-0">
                ghost post
              </span>
            </Link>
          )}

          {/* Filters — wrapped in Suspense per CLAUDE.md requirement */}
          <Suspense fallback={<div className="h-10 bg-[var(--accent-soft)] rounded-full animate-pulse mb-4" />}>
            <FeedFilters subVillages={subVillages ?? []} />
          </Suspense>

          {/* Posts list */}
          <div className="space-y-4 mt-4">
            {error ? (
              <div className="text-center py-12 text-red-600 dark:text-red-400 font-serif" role="alert">
                Failed to load posts. Please try refreshing.
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)] font-serif">
                <p>No posts yet. Be the first to share with the village!</p>
              </div>
            ) : (
              <>
                {(posts as PublicPost[]).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}

                {/* Pagination */}
                <div className="flex justify-between items-center pt-4 text-sm text-[var(--text-muted)] ui-sans">
                  <span>
                    Showing {posts.length} of {count ?? 0} posts
                  </span>
                  <div className="flex gap-2">
                    {page > 0 && (
                      <Link
                        href={`/feed?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]), page: String(page - 1) }).toString()}`}
                        className="px-3 py-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--clay)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                      >
                        ← Prev
                      </Link>
                    )}
                    {posts.length === PAGE_SIZE && (
                      <Link
                        href={`/feed?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]), page: String(page + 1) }).toString()}`}
                        className="px-3 py-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--clay)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                      >
                        Next →
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Sidebar — hidden on mobile, visible lg+ */}
        <aside className="w-72 shrink-0 hidden lg:block">
          <Sidebar />
        </aside>

      </div>
    </div>
  )
}

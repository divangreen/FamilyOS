import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { FeedFilters } from '@/components/FeedFilters'
import { PostCard } from '@/components/PostCard'
import type { UserRole, PublicPost } from '@/lib/supabase/types'

const PAGE_SIZE = 20

interface FeedPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const role      = (typeof params.role       === 'string' ? params.role       : null) as UserRole | null
  const sort      =  typeof params.sort       === 'string' ? params.sort       : 'recent'
  const subVillage = typeof params.subVillage === 'string' ? params.subVillage : null
  const page      =  Math.max(0, parseInt(typeof params.page === 'string' ? params.page : '0', 10))

  // Fetch sub-villages for filter
  const { data: subVillages } = await supabase
    .from('sub_villages')
    .select('id, name')
    .order('name')

  // Query public_posts view directly (never raw posts table)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 z-20">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">The Village</h1>
          <nav className="flex gap-2" aria-label="User actions">
            {user ? (
              <>
                <Link
                  href="/apply-expert"
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  Apply as Expert
                </Link>
                <Link
                  href="/post/new"
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  + New Post
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Login
              </Link>
            )}
          </nav>
        </header>

        {/* Filters — client component needs Suspense for useSearchParams */}
        <div className="px-4 pt-4">
          <Suspense fallback={<div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
            <FeedFilters subVillages={subVillages ?? []} />
          </Suspense>
        </div>

        {/* Posts */}
        <main className="p-4 space-y-4">
          {error ? (
            <div className="text-center py-12 text-red-600 dark:text-red-400" role="alert">
              Failed to load posts. Please try refreshing.
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No posts found. Be the first to share!</p>
            </div>
          ) : (
            <>
              {(posts as PublicPost[]).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}

              {/* Pagination */}
              <div className="flex justify-between items-center pt-4 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Showing {posts.length} of {count ?? 0} posts
                </span>
                <div className="flex gap-2">
                  {page > 0 && (
                    <Link
                      href={`/feed?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]), page: String(page - 1) }).toString()}`}
                      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                    >
                      ← Prev
                    </Link>
                  )}
                  {posts.length === PAGE_SIZE && (
                    <Link
                      href={`/feed?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]), page: String(page + 1) }).toString()}`}
                      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

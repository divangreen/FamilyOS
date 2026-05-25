import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type PostRow = Pick<Database['public']['Tables']['posts']['Row'], 'id' | 'title' | 'created_at'>

// NOTE: The posts table does not yet have `is_flagged` or `moderation_flags`
// columns. This page shows the 50 most recent posts as a moderation queue
// placeholder. When those columns are added via migration, update the query
// to: .eq('is_flagged', true)

export default async function FlaggedPostsPage() {
  const supabase = await createClient()
  const { data: posts } = await (supabase as any)
    .from('posts')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(50) as { data: PostRow[] | null }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Flagged Posts
      </h1>
      <p className="text-sm text-amber-600 dark:text-amber-400 mb-6">
        Moderation flag columns are not yet in the schema. Showing recent posts
        as a queue placeholder.
      </p>
      {!posts?.length && (
        <p className="text-gray-500 dark:text-gray-400">No posts found.</p>
      )}
      <ul className="space-y-3">
        {posts?.map((post) => (
          <li
            key={post.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {post.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
              <Link
                href={`/post/${post.id}`}
                className="shrink-0 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View Post →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

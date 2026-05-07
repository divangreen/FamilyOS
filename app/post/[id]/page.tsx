import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Ghost } from 'lucide-react'
import { CommentThread } from '@/components/CommentThread'
import { RoleBadge } from '@/components/RoleBadge'
import { ReplyForm } from './ReplyForm'
import { formatRelativeTime } from '@/lib/utils'
import type { UserRole, Comment as DBComment } from '@/lib/supabase/types'

interface PostPageProps {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Always read posts via the public_posts view — never the raw table
  const { data: post, error: postError } = await supabase
    .from('public_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (postError || !post) notFound()

  type RawComment = DBComment & {
    author: { display_name: string; role: UserRole; is_verified_expert: boolean } | null
    ghost_alias: { alias_name: string } | null
  }

  // Fetch comments with author + ghost alias via join
  const { data: rawCommentsData } = await supabase
    .from('comments')
    .select(`
      *,
      author:author_id (display_name, role, is_verified_expert),
      ghost_alias:ghost_alias_id (alias_name)
    `)
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const rawComments = (rawCommentsData as unknown as RawComment[]) ?? []

  // Shape comments to the interface CommentThread expects
  const comments = rawComments.map((c) => ({
    ...c,
    author: c.is_ghost_post || !c.author
      ? undefined
      : { displayName: c.author.display_name, role: c.author.role, isVerified: c.author.is_verified_expert },
    ghostAlias: c.ghost_alias?.alias_name ?? null,
  }))

  const authorName = post.is_ghost_post
    ? (post.alias_name ?? 'Anonymous')
    : (post.display_name ?? 'Unknown')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto">

        {/* Nav */}
        <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/feed"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded"
          >
            ← Back to feed
          </Link>
        </div>

        {/* Post header */}
        <div className="px-6 pt-6 pb-4 bg-white dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {post.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600 dark:text-gray-400">
            {post.is_ghost_post ? (
              <span className="flex items-center gap-1">
                <Ghost className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{authorName}</span>
                <span className="text-xs text-gray-400">· ghost post</span>
              </span>
            ) : (
              <>
                {post.role && (
                  <RoleBadge role={post.role} isVerified={post.is_verified_expert ?? false} />
                )}
                <span>{authorName}</span>
              </>
            )}
            {post.sub_village_name && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {post.sub_village_name}
                </span>
              </>
            )}
            <time dateTime={post.created_at} className="ml-auto text-xs">
              {formatRelativeTime(post.created_at)}
            </time>
          </div>
        </div>

        {/* Post body */}
        <article
          className="px-6 pb-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
          aria-label={`Post: ${post.title}`}
        >
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
            {post.body}
          </p>
          <div className="mt-4 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>👍 {post.helpful_count} helpful</span>
            <span>💬 {comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
          </div>
        </article>

        {/* Comments */}
        <section
          id="comments"
          className="p-6"
          aria-label="Comments"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Comments
          </h2>
          <CommentThread comments={comments} />
        </section>

        {/* Reply form */}
        <div className="px-6 pb-8">
          {user ? (
            <ReplyForm postId={id} userId={user.id} />
          ) : (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">
              <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Log in
              </Link>{' '}
              to leave a comment.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}

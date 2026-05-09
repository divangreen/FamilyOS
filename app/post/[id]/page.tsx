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
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-3xl mx-auto">

        {/* Nav */}
        <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border)] ui-sans">
          <Link
            href="/feed"
            className="text-sm text-[var(--accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded"
          >
            ← Back to feed
          </Link>
        </div>

        {/* Post header */}
        <div className="px-6 pt-6 pb-4 bg-[var(--bg-surface)]">
          <h1 className="text-2xl font-bold text-[var(--earth)] font-serif leading-snug mb-3">
            {post.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-[var(--text-muted)] ui-sans">
            {post.is_ghost_post ? (
              <span className="flex items-center gap-1.5">
                <Ghost className="h-3.5 w-3.5 text-[var(--ghost-accent)]" aria-hidden="true" />
                <span className="text-[var(--ghost-accent)] font-medium">{authorName}</span>
                <span className="text-xs bg-[var(--sand)] text-[var(--clay)] px-1.5 py-0.5 rounded-full">ghost</span>
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
                <span className="text-xs bg-[var(--sand)] text-[var(--clay)] px-2 py-0.5 rounded-full">
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
          className="px-6 pb-6 bg-[var(--bg-surface)] border-b border-[var(--border)]"
          aria-label={`Post: ${post.title}`}
        >
          <p className="font-serif text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed text-base">
            {post.body}
          </p>
          <div className="mt-4 flex gap-4 text-sm text-[var(--text-muted)] ui-sans">
            <span>♥ {post.helpful_count} helpful</span>
            <span>💬 {comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
          </div>
        </article>

        {/* Comments */}
        <section
          id="comments"
          className="p-6"
          aria-label="Comments"
        >
          <h2 className="text-lg font-semibold text-[var(--earth)] font-serif mb-4">
            Comments
          </h2>
          <CommentThread comments={comments} />
        </section>

        {/* Reply form */}
        <div className="px-6 pb-8">
          {user ? (
            <ReplyForm postId={id} userId={user.id} />
          ) : (
            <p className="text-sm text-center text-[var(--text-muted)] py-4 ui-sans">
              <Link href="/login" className="text-[var(--accent)] hover:underline">
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

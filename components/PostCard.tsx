'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ghost } from 'lucide-react'
import { type PublicPost } from '@/lib/supabase/types'
import { RoleBadge } from './RoleBadge'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'

interface PostCardProps {
  post: PublicPost
}

/** Derive initials from a display name for the avatar circle */
function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Avatar background color keyed by role — matches the role badge palette */
const avatarBg: Record<string, string> = {
  mom:      'bg-[#FDE8D8]',
  dad:      'bg-[#E8F0FE]',
  guardian: 'bg-[#EDE8F5]',
  expert:   'bg-[#FFF3CD]',
  admin:    'bg-[#FDE8D8]',
  ghost:    'bg-[var(--ghost-pearl)]',
}

const avatarText: Record<string, string> = {
  mom:      'text-[#8B4513]',
  dad:      'text-[#1A3A6C]',
  guardian: 'text-[#3D1F5C]',
  expert:   'text-[#7D4E00]',
  admin:    'text-[#8B4513]',
  ghost:    'text-[var(--ghost-accent)]',
}

export function PostCard({ post }: PostCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(post.helpful_count)
  const [voted, setVoted] = useState(false)
  const [voting, setVoting] = useState(false)

  const authorName = post.is_ghost_post
    ? (post.alias_name ?? 'Anonymous')
    : (post.display_name ?? 'Unknown')

  const roleKey = post.is_ghost_post ? 'ghost' : (post.role ?? 'guardian')
  const isExpert = post.role === 'expert'

  async function handleVote(e: React.MouseEvent) {
    e.preventDefault()
    if (voting) return
    setVoting(true)

    const optimistic = !voted
    setVoted(optimistic)
    setHelpfulCount((n) => n + (optimistic ? 1 : -1))

    try {
      const res = await fetch('/api/votes/helpful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: post.id, targetType: 'post' }),
      })
      if (!res.ok) {
        setVoted(!optimistic)
        setHelpfulCount((n) => n + (optimistic ? -1 : 1))
      }
    } catch {
      setVoted(!optimistic)
      setHelpfulCount((n) => n + (optimistic ? -1 : 1))
    } finally {
      setVoting(false)
    }
  }

  return (
    <article
      className={cn(
        'bg-[var(--bg-surface)] rounded-xl transition-shadow hover:shadow-md',
        // Ghost posts get a plum left accent border instead of the standard border
        post.is_ghost_post
          ? 'border border-[var(--border)] border-l-4 border-l-[var(--ghost-accent)]'
          : isExpert
            // Expert/featured posts get a slightly heavier terracotta border
            ? 'border border-[var(--accent)]'
            : 'border border-[var(--border)]'
      )}
    >
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <Link
            href={`/post/${post.id}`}
            className="flex-1 min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded"
          >
            <h2 className="font-semibold text-lg text-[var(--text-primary)] font-serif break-words hover:text-[var(--accent)] transition-colors leading-snug">
              {post.title}
            </h2>
          </Link>

          {/* Sub-village tag */}
          {post.sub_village_name && (
            <span className="bg-[var(--sand)] text-[var(--clay)] rounded-full text-xs px-2 py-0.5 whitespace-nowrap ui-sans shrink-0">
              {post.sub_village_name}
            </span>
          )}
        </div>

        {/* Excerpt */}
        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2 font-serif leading-relaxed">
          {truncate(post.body, 150)}
        </p>

        {/* Author row */}
        <div className="flex items-center gap-2">
          {/* Avatar circle */}
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ui-sans shrink-0',
              avatarBg[roleKey] ?? avatarBg.guardian,
              avatarText[roleKey] ?? avatarText.guardian
            )}
            aria-hidden="true"
          >
            {post.is_ghost_post ? '👻' : initials(authorName)}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] flex-1 min-w-0 ui-sans">
            {post.is_ghost_post ? (
              <>
                <Ghost className="h-3 w-3 shrink-0 text-[var(--ghost-accent)]" aria-hidden="true" />
                <span className="font-medium text-[var(--ghost-accent)]">{authorName}</span>
                {/* Ghost role badge */}
                <span className="bg-[var(--sand)] text-[var(--clay)] px-1.5 py-0.5 rounded-full text-xs">
                  ghost
                </span>
              </>
            ) : (
              <>
                {post.role && (
                  <RoleBadge role={post.role} isVerified={post.is_verified_expert ?? false} />
                )}
                <span className="truncate">{authorName}</span>
              </>
            )}
          </div>

          <time
            dateTime={post.created_at}
            className="text-xs text-[var(--text-muted)] shrink-0 ui-sans"
          >
            {formatRelativeTime(post.created_at)}
          </time>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-4 px-4 border-t border-[var(--border)] pt-3 pb-3 text-xs text-[var(--text-muted)] ui-sans">
        {/* Heart vote button */}
        <button
          onClick={handleVote}
          disabled={voting}
          aria-label={`Mark post helpful. ${helpfulCount} helpful votes.`}
          aria-pressed={voted}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
            voted
              ? 'text-[var(--accent)]'
              : 'hover:text-[var(--accent)]',
            voting && 'opacity-50 cursor-not-allowed'
          )}
        >
          {/* Heart icon — filled when voted */}
          <span aria-hidden="true" className="text-sm leading-none">
            {voted ? '♥' : '♡'}
          </span>
          <span>{helpfulCount}</span>
        </button>

        <Link
          href={`/post/${post.id}#comments`}
          className="hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded flex items-center gap-1"
          aria-label={`View comments on ${post.title}`}
        >
          💬 Reply
        </Link>
      </div>
    </article>
  )
}

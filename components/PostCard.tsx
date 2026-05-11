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

/**
 * Avatar background/text colors keyed by role.
 * Kept as soft tints that harmonize with the slate/emerald palette.
 */
const avatarBg: Record<string, string> = {
  mom:      'bg-rose-100',
  dad:      'bg-sky-100',
  guardian: 'bg-violet-100',
  expert:   'bg-amber-50',
  admin:    'bg-rose-100',
  ghost:    'bg-violet-100',
}

const avatarText: Record<string, string> = {
  mom:      'text-rose-700',
  dad:      'text-sky-700',
  guardian: 'text-violet-700',
  expert:   'text-amber-800',
  admin:    'text-rose-700',
  ghost:    'text-violet-700',
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
        'bg-white rounded-2xl border transition-shadow hover:shadow-md',
        // Ghost posts: violet left-accent border to signal anonymity
        post.is_ghost_post
          ? 'border-slate-200 border-l-4 border-l-violet-400'
          : isExpert
            // Expert posts: emerald border to signal verified authority
            ? 'border-emerald-200'
            : 'border-slate-200'
      )}
    >
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <Link
            href={`/post/${post.id}`}
            className="flex-1 min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 rounded"
          >
            <h2 className="font-semibold text-lg text-slate-900 font-serif break-words hover:text-emerald-800 transition-colors leading-snug">
              {post.title}
            </h2>
          </Link>

          {/* Sub-village tag */}
          {post.sub_village_name && (
            <span className="bg-slate-100 text-slate-600 rounded-full text-xs px-2 py-0.5 whitespace-nowrap ui-sans shrink-0">
              {post.sub_village_name}
            </span>
          )}
        </div>

        {/* Excerpt */}
        <p className="text-sm text-slate-700 mb-4 line-clamp-2 font-serif leading-relaxed">
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

          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-1 min-w-0 ui-sans">
            {post.is_ghost_post ? (
              <>
                <Ghost className="h-3 w-3 shrink-0 text-violet-600" aria-hidden="true" />
                <span className="font-medium text-violet-700">{authorName}</span>
                {/* Ghost role badge */}
                <span className="bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full text-xs">
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
            className="text-xs text-slate-400 shrink-0 ui-sans"
          >
            {formatRelativeTime(post.created_at)}
          </time>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-4 px-4 border-t border-slate-100 pt-3 pb-3 text-xs text-slate-500 ui-sans">
        {/* Heart vote button */}
        <button
          onClick={handleVote}
          disabled={voting}
          aria-label={`Mark post helpful. ${helpfulCount} helpful votes.`}
          aria-pressed={voted}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
            voted
              ? 'text-emerald-800'
              : 'hover:text-emerald-700',
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
          className="hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 rounded flex items-center gap-1"
          aria-label={`View comments on ${post.title}`}
        >
          💬 Reply
        </Link>
      </div>
    </article>
  )
}

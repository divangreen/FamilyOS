'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThumbsUp, Ghost } from 'lucide-react'
import { type PublicPost } from '@/lib/supabase/types'
import { RoleBadge } from './RoleBadge'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'

interface PostCardProps {
  post: PublicPost
}

export function PostCard({ post }: PostCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(post.helpful_count)
  const [voted, setVoted] = useState(false)
  const [voting, setVoting] = useState(false)

  const authorName = post.is_ghost_post
    ? (post.alias_name ?? 'Anonymous')
    : (post.display_name ?? 'Unknown')

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
        // Revert
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
    <article className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-gray-800 transition">
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link
          href={`/post/${post.id}`}
          className="flex-1 min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded"
        >
          <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100 break-words hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {post.title}
          </h2>
        </Link>
        {post.sub_village_name && (
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded whitespace-nowrap">
            {post.sub_village_name}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {truncate(post.body, 150)}
      </p>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          {post.is_ghost_post ? (
            <span className="flex items-center gap-1">
              <Ghost className="h-3 w-3" aria-hidden="true" />
              <span>{authorName}</span>
              <span className="text-gray-400">· ghost</span>
            </span>
          ) : (
            <>
              {post.role && (
                <RoleBadge role={post.role} isVerified={post.is_verified_expert ?? false} />
              )}
              <span>{authorName}</span>
            </>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>

      <div className="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <button
          onClick={handleVote}
          disabled={voting}
          aria-label={`Mark post helpful. ${helpfulCount} helpful votes.`}
          aria-pressed={voted}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
            voted ? 'text-blue-600 dark:text-blue-400' : 'hover:text-blue-600 dark:hover:text-blue-400',
            voting && 'opacity-50 cursor-not-allowed'
          )}
        >
          <ThumbsUp className="h-3 w-3" aria-hidden="true" />
          <span>{helpfulCount}</span>
        </button>
        <Link
          href={`/post/${post.id}#comments`}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded"
          aria-label={`View comments on ${post.title}`}
        >
          💬 Reply
        </Link>
      </div>
    </article>
  )
}

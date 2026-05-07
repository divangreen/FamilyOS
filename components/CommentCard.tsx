'use client'

import { type UserRole } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const roleStyles: Record<UserRole, { border: string; bg: string; badge: string; text: string }> = {
  mom: {
    border: 'border-l-teal-400 dark:border-l-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    badge: 'bg-teal-100 dark:bg-teal-900/50 text-teal-900 dark:text-teal-100',
    text: 'text-teal-700 dark:text-teal-300',
  },
  dad: {
    border: 'border-l-slate-400 dark:border-l-slate-500',
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    badge: 'bg-slate-100 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100',
    text: 'text-slate-700 dark:text-slate-300',
  },
  guardian: {
    border: 'border-l-violet-400 dark:border-l-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    badge: 'bg-violet-100 dark:bg-violet-900/50 text-violet-900 dark:text-violet-100',
    text: 'text-violet-700 dark:text-violet-300',
  },
  expert: {
    border: 'border-l-amber-400 dark:border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100',
    text: 'text-amber-700 dark:text-amber-300',
  },
  admin: {
    border: 'border-l-rose-400 dark:border-l-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100',
    text: 'text-rose-700 dark:text-rose-300',
  },
}

interface CommentCardProps {
  author: {
    displayName: string
    role: UserRole
    isVerified: boolean
  }
  body: string
  helpfulCount: number
  createdAt: string
  depth: number
  isGhost: boolean
  ghostAlias?: string | null
  onHelpfulVote?: () => void
  children?: React.ReactNode
}

export function CommentCard({
  author,
  body,
  helpfulCount,
  createdAt,
  depth,
  isGhost,
  ghostAlias,
  onHelpfulVote,
  children,
}: CommentCardProps) {
  const styles = roleStyles[author.role]
  const indentPx = Math.min(depth * 20, 100)
  const authorName = isGhost ? (ghostAlias || 'Ghost User') : author.displayName

  return (
    <article
      className={cn('border-l-4', styles.border, styles.bg, 'p-4 mb-4')}
      style={{ marginLeft: `${indentPx}px` }}
      aria-label={`Comment by ${authorName} with ${helpfulCount} helpful votes`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            'px-2 py-1 rounded text-sm font-medium',
            styles.badge
          )}
        >
          {author.role === 'expert' && author.isVerified ? '✓' : ''}
          {author.role.charAt(0).toUpperCase() + author.role.slice(1)}
        </div>
        {isGhost && (
          <span className={cn('text-xs', styles.text)}>· ghost post</span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-sm mb-1">{authorName}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{body}</p>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={onHelpfulVote}
          className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          aria-label="Mark as helpful"
        >
          👍 {helpfulCount}
        </button>
      </div>

      {children && <div className="mt-4">{children}</div>}
    </article>
  )
}

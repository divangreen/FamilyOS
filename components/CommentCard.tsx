'use client'

import { type UserRole } from '@/lib/supabase/types'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Left-border accent colors follow the new role palette.
 * Ghost comments get a violet dashed border and faint violet tint.
 */
const roleStyles: Record<UserRole, { border: string; bg: string }> = {
  mom:      { border: 'border-l-rose-400',    bg: 'bg-rose-50/40' },
  dad:      { border: 'border-l-sky-400',     bg: 'bg-sky-50/40' },
  guardian: { border: 'border-l-violet-400',  bg: 'bg-violet-50/40' },
  expert:   { border: 'border-l-emerald-500', bg: 'bg-emerald-50/40' },
  admin:    { border: 'border-l-slate-400',   bg: 'bg-slate-50/60' },
}

/** Role badge chip inside comment — mirrors RoleBadge but inline */
const roleBadgeStyles: Record<UserRole, string> = {
  mom:      'bg-rose-50 text-rose-700 border border-rose-200',
  dad:      'bg-sky-50 text-sky-700 border border-sky-200',
  guardian: 'bg-violet-50 text-violet-700 border border-violet-200',
  expert:   'bg-emerald-50 text-emerald-800 border border-emerald-200',
  admin:    'bg-slate-100 text-slate-700 border border-slate-200',
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
  const indentPx = Math.min(depth * 20, 100)
  const authorName = isGhost ? (ghostAlias || 'Ghost User') : author.displayName

  const styles = isGhost
    ? { border: 'border-l-violet-400 border-dashed', bg: 'bg-violet-50/30' }
    : roleStyles[author.role]

  return (
    <article
      className={cn(
        'border-l-4 p-4 mb-4 rounded-r-lg',
        styles.border,
        styles.bg
      )}
      style={{ marginLeft: `${indentPx}px` }}
      aria-label={`Comment by ${authorName} with ${helpfulCount} helpful votes`}
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-2 ui-sans">
        {/* Role / ghost badge */}
        {isGhost ? (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-semibold">
            👻 ghost
          </span>
        ) : (
          <span className={cn(
            'inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold',
            roleBadgeStyles[author.role]
          )}>
            {author.role === 'expert' && author.isVerified && (
              <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            {author.role.charAt(0).toUpperCase() + author.role.slice(1)}
          </span>
        )}

        <span className="text-xs font-semibold text-slate-900">
          {authorName}
        </span>

        <time
          dateTime={createdAt}
          className="text-xs text-slate-400 ml-auto"
        >
          {new Date(createdAt).toLocaleDateString()}
        </time>
      </div>

      {/* Body */}
      <p className="text-sm text-slate-800 leading-relaxed font-serif mb-3">
        {body}
      </p>

      {/* Footer actions */}
      <div className="flex items-center gap-4 text-xs text-slate-500 ui-sans">
        <button
          onClick={onHelpfulVote}
          className="flex items-center gap-1 hover:text-emerald-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 rounded"
          aria-label="Mark as helpful"
        >
          <span aria-hidden="true">♡</span>
          <span>{helpfulCount}</span>
        </button>
      </div>

      {children && <div className="mt-4">{children}</div>}
    </article>
  )
}

'use client'

import { type UserRole } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

/**
 * Left-border accent colors follow the village role palette.
 * Ghost comments get a dashed plum border and a faint ghost-bg tint.
 */
const roleStyles: Record<UserRole, { border: string; bg: string }> = {
  mom:      { border: 'border-l-[#C1440E]',  bg: 'bg-[#FDE8D8]/10' },
  dad:      { border: 'border-l-[#1A5276]',  bg: 'bg-[#E8F0FE]/10' },
  guardian: { border: 'border-l-[#7C4CA0]',  bg: 'bg-[#EDE8F5]/10' },
  expert:   { border: 'border-l-[#D4A017]',  bg: 'bg-[#FFF3CD]/10' },
  admin:    { border: 'border-l-[#C1440E]',  bg: 'bg-[#FDE8D8]/10' },
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
    ? { border: 'border-l-[#7C4CA0] border-dashed', bg: 'bg-[var(--ghost-bg)]/5' }
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
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--ghost-pearl)] text-[var(--ghost-accent)] font-medium">
            👻 ghost
          </span>
        ) : (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            author.role === 'mom'      && 'bg-[#FDE8D8] text-[#8B4513]',
            author.role === 'dad'      && 'bg-[#E8F0FE] text-[#1A3A6C]',
            author.role === 'guardian' && 'bg-[#EDE8F5] text-[#3D1F5C]',
            author.role === 'expert'   && 'bg-[#FFF3CD] text-[#7D4E00]',
            author.role === 'admin'    && 'bg-[#FDE8D8] text-[#8B4513]',
          )}>
            {author.role === 'expert' && author.isVerified && (
              <span className="text-[var(--accent)] mr-0.5">✓</span>
            )}
            {author.role.charAt(0).toUpperCase() + author.role.slice(1)}
          </span>
        )}

        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {authorName}
        </span>

        <time
          dateTime={createdAt}
          className="text-xs text-[var(--text-muted)] ml-auto"
        >
          {new Date(createdAt).toLocaleDateString()}
        </time>
      </div>

      {/* Body */}
      <p className="text-sm text-[var(--text-primary)] leading-relaxed font-serif mb-3">
        {body}
      </p>

      {/* Footer actions */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] ui-sans">
        <button
          onClick={onHelpfulVote}
          className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded"
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

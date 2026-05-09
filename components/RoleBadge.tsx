import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/types'

/**
 * Role badge colors follow the village warm-earth palette.
 * Expert badges show a terracotta verified checkmark when isVerified is true.
 */
const ROLE_STYLES: Record<UserRole, { badge: string; label: string }> = {
  mom:      { badge: 'bg-[#FDE8D8] text-[#8B4513]',  label: 'Mom' },
  dad:      { badge: 'bg-[#E8F0FE] text-[#1A3A6C]',  label: 'Dad' },
  guardian: { badge: 'bg-[#EDE8F5] text-[#3D1F5C]',  label: 'Guardian' },
  // Expert badge — gold dot prefix indicates verified standing
  expert:   { badge: 'bg-[#FFF3CD] text-[#7D4E00]',  label: 'Expert' },
  admin:    { badge: 'bg-[#FDE8D8] text-[#8B4513]',  label: 'Admin' },
}

interface RoleBadgeProps {
  role: UserRole
  isVerified?: boolean
  className?: string
}

export function RoleBadge({ role, isVerified, className }: RoleBadgeProps) {
  const { badge, label } = ROLE_STYLES[role]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ui-sans',
        badge,
        className
      )}
      aria-label={`Role: ${label}${role === 'expert' && isVerified ? ' (verified)' : ''}`}
    >
      {/* Gold dot for verified experts */}
      {role === 'expert' && isVerified && (
        <span className="text-[var(--accent)]" aria-hidden="true">●</span>
      )}
      {label}
      {/* Verified checkmark for expert */}
      {role === 'expert' && isVerified && (
        <span className="text-[var(--accent)] font-bold" aria-hidden="true">✓</span>
      )}
    </span>
  )
}
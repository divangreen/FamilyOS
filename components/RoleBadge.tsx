import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/types'

const ROLE_STYLES: Record<UserRole, { badge: string; label: string }> = {
  mom:      { badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',     label: 'Mom' },
  dad:      { badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',  label: 'Dad' },
  guardian: { badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200', label: 'Guardian' },
  expert:   { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',  label: 'Expert ✓' },
  admin:    { badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',      label: 'Admin' },
}

interface RoleBadgeProps {
  role: UserRole
  isVerified?: boolean
  className?: string
}

export function RoleBadge({ role, isVerified, className }: RoleBadgeProps) {
  const { badge, label } = ROLE_STYLES[role]
  const displayLabel = role === 'expert' && isVerified ? label : role === 'expert' ? 'Expert' : label

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        badge,
        className
      )}
      aria-label={`Role: ${displayLabel}`}
    >
      {displayLabel}
    </span>
  )
}

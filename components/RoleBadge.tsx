import { cn } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'
import type { UserRole } from '@/lib/supabase/types'

/**
 * Role badge colors use soft tints from the new slate/emerald/amber palette.
 * Expert badges show a ShieldCheck icon when isVerified is true (emerald accent).
 */
const ROLE_STYLES: Record<UserRole, { badge: string; label: string }> = {
  mom:      { badge: 'bg-rose-50 text-rose-700 border border-rose-200',         label: 'Mom' },
  dad:      { badge: 'bg-sky-50 text-sky-700 border border-sky-200',            label: 'Dad' },
  guardian: { badge: 'bg-violet-50 text-violet-700 border border-violet-200',   label: 'Guardian' },
  // Expert badge matches the expert flair on the landing page
  expert:   { badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200', label: 'Expert' },
  admin:    { badge: 'bg-slate-100 text-slate-700 border border-slate-200',      label: 'Admin' },
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ui-sans',
        badge,
        className
      )}
      aria-label={`Role: ${label}${role === 'expert' && isVerified ? ' (verified)' : ''}`}
    >
      {/* ShieldCheck icon for verified experts, matching landing page expert flair */}
      {role === 'expert' && isVerified && (
        <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {label}
    </span>
  )
}

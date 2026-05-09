'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { type UserRole } from '@/lib/supabase/types'

interface FeedFiltersProps {
  subVillages?: Array<{ id: string; name: string }>
}

const roleOptions: Array<{ label: string; value: string }> = [
  { label: 'All',       value: 'all' },
  { label: 'Moms',      value: 'mom' },
  { label: 'Dads',      value: 'dad' },
  { label: 'Guardians', value: 'guardian' },
  { label: 'Experts',   value: 'expert' },
]

const sortOptions: Array<{ label: string; value: string }> = [
  { label: 'Recent',       value: 'recent' },
  { label: 'Most helpful', value: 'helpful' },
  { label: 'Popular',      value: 'popular' },
]

/** Shared pill class builder — active pills use terracotta accent */
function pillClass(isActive: boolean): string {
  return cn(
    'px-3 py-1 rounded-full text-xs border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]',
    isActive
      ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--clay)]'
  )
}

export function FeedFilters({ subVillages = [] }: FeedFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const activeRole     = (searchParams.get('role') as UserRole | null) || 'all'
  const activeSort     = searchParams.get('sort') || 'recent'
  const activeVillage  = searchParams.get('subVillage') || 'all'

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('page') // Reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="ui-sans space-y-2 py-3">
      {/* Role + Sort row */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Role pills */}
        {roleOptions.map((r) => (
          <button
            key={r.value}
            onClick={() => updateFilter('role', r.value)}
            className={pillClass(activeRole === r.value)}
            aria-pressed={activeRole === r.value}
          >
            {r.label}
          </button>
        ))}

        {/* Sort pills pushed to the right */}
        <div className="ml-auto flex gap-2">
          {sortOptions.map((s) => (
            <button
              key={s.value}
              onClick={() => updateFilter('sort', s.value)}
              className={pillClass(activeSort === s.value)}
              aria-pressed={activeSort === s.value}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-village pills — shown only when sub-villages exist */}
      {subVillages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => updateFilter('subVillage', 'all')}
            className={pillClass(activeVillage === 'all')}
            aria-pressed={activeVillage === 'all'}
          >
            All Villages
          </button>
          {subVillages.map((sv) => (
            <button
              key={sv.id}
              onClick={() => updateFilter('subVillage', sv.id)}
              className={pillClass(activeVillage === sv.id)}
              aria-pressed={activeVillage === sv.id}
            >
              {sv.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
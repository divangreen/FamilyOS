"use client"

import React, { useState, useEffect, useRef } from 'react'
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

/** Shared pill class builder — active pills use emerald accent */
function pillClass(isActive: boolean): string {
  return cn(
    'px-3 py-1 rounded-full text-xs border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600',
    isActive
      ? 'bg-emerald-800 border-emerald-800 text-white'
      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-600 hover:text-emerald-800'
  )
}

export function FeedFilters({ subVillages = [] }: FeedFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const qParam = searchParams.get('q') || ''
  const [searchValue, setSearchValue] = useState(qParam)
  const debounceRef = useRef<number | null>(null)

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

  // Debounced update of 'q' param
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (!searchValue) {
        params.delete('q')
      } else {
        params.set('q', searchValue)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    }, 400)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [searchValue])


  return (
    <div className="ui-sans space-y-2 py-3">
      {/* Search input */}
      <div>
        <input
          aria-label="Search posts"
          type="search"
          placeholder="Search the village..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
        />
      </div>
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

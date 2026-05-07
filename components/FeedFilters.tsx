'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { type UserRole } from '@/lib/supabase/types'

interface FeedFiltersProps {
  subVillages?: Array<{ id: string; name: string }>
}

const roles: UserRole[] = ['mom', 'dad', 'guardian', 'expert']

export function FeedFilters({ subVillages = [] }: FeedFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const pathname = usePathname()
  const role = (searchParams.get('role') as UserRole | null) || 'all'
  const sort = searchParams.get('sort') || 'recent'
  const subVillage = searchParams.get('subVillage') || 'all'

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('page') // Reset pagination
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      {/* Role Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => updateFilter('role', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="all">All</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Sort Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort
        </label>
        <select
          value={sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="recent">Recent</option>
          <option value="helpful">Most Helpful</option>
          <option value="popular">Popular</option>
        </select>
      </div>

      {/* Sub-Village Filter */}
      {subVillages.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Village
          </label>
          <select
            value={subVillage}
            onChange={(e) => updateFilter('subVillage', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All Villages</option>
            {subVillages.map((sv) => (
              <option key={sv.id} value={sv.id}>
                {sv.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

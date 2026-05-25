'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin',              label: 'Overview' },
  { href: '/admin/applications', label: 'Expert Applications' },
  { href: '/admin/users',        label: 'Users' },
  { href: '/admin/posts',        label: 'Flagged Posts' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col gap-1 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Admin
      </p>
      {NAV.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={[
            'px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === href
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
        >
          {label}
        </Link>
      ))}
    </aside>
  )
}

import { createClient } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const db = supabase as any
  const [
    { count: pendingApps },
    { count: totalUsers },
    { count: totalPosts },
  ] = await Promise.all([
    db
      .from('expert_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending') as Promise<{ count: number | null }>,
    db
      .from('users')
      .select('*', { count: 'exact', head: true }) as Promise<{ count: number | null }>,
    db
      .from('posts')
      .select('*', { count: 'exact', head: true }) as Promise<{ count: number | null }>,
  ])

  const stats = [
    {
      label: 'Pending Applications',
      value: pendingApps ?? 0,
      accent: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Total Users',
      value: totalUsers ?? 0,
      accent: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Total Posts',
      value: totalPosts ?? 0,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Dashboard Overview
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, accent }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-4xl font-bold mt-1 ${accent}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

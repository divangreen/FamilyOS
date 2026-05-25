import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ExpertApplication } from '@/lib/supabase/types'

type AppRow = Pick<ExpertApplication, 'id' | 'status' | 'created_at' | 'specialty' | 'user_id'>

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: apps } = await (supabase as any)
    .from('expert_applications')
    .select('id, status, created_at, specialty, user_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true }) as { data: AppRow[] | null }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Pending Expert Applications
      </h1>
      {!apps?.length && (
        <p className="text-gray-500 dark:text-gray-400">No pending applications.</p>
      )}
      <ul className="space-y-3">
        {apps?.map((app) => (
          <li
            key={app.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {app.specialty ?? 'No specialty listed'}
              </p>
              <p className="text-xs font-mono text-gray-400 mt-0.5">{app.id}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Submitted {new Date(app.created_at).toLocaleDateString()}
              </p>
            </div>
            <Link
              href={`/admin/applications/${app.id}`}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Review →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

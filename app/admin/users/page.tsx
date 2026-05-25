import { createClient } from '@/lib/supabase/server'
import type { User } from '@/lib/supabase/types'

type UserRow = Pick<User, 'id' | 'display_name' | 'role' | 'cred_score' | 'is_verified_expert' | 'created_at'>

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: users } = await (supabase as any)
    .from('users')
    .select('id, display_name, role, cred_score, is_verified_expert, created_at')
    .order('created_at', { ascending: false })
    .limit(100) as { data: UserRow[] | null }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Users</h1>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cred
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Expert
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users?.map((u) => (
              <tr
                key={u.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                  {u.display_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">
                  {u.role}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {u.cred_score ?? 0}
                </td>
                <td className="px-4 py-3">
                  {u.is_verified_expert ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Yes
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

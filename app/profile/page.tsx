import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@/lib/supabase/types'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rawProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = rawProfile as unknown as User | null

  // TODO: render profile details, edit form, expert badge status

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold text-slate-900 mb-6"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Your Profile
      </h1>
      {profile && (
        <dl className="space-y-2 text-sm text-slate-700">
          <div>
            <dt className="font-medium text-slate-900">Display name</dt>
            <dd className="text-slate-600">{profile.display_name}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Role</dt>
            <dd className="capitalize text-slate-600">{profile.role}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Verified expert</dt>
            <dd className="text-slate-600">{profile.is_verified_expert ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      )}
      {/* TODO: edit form, avatar upload */}
    </main>
  )
}

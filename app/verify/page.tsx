import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ExpertApplication } from '@/lib/supabase/types'

export default async function VerifyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rawApplication } = await supabase
    .from('expert_applications')
    .select('status, created_at, reviewer_notes')
    .eq('user_id', user.id)
    .single()

  const application = rawApplication as unknown as Pick<
    ExpertApplication,
    'status' | 'created_at' | 'reviewer_notes'
  > | null

  // TODO: render real-time status updates via Supabase Realtime

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold text-slate-900 mb-4"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Expert Verification
      </h1>

      {!application && (
        <div className="space-y-4">
          <p className="text-slate-700">
            Apply for expert verification to display a badge on your posts.
          </p>
          <Link
            href="/apply-expert"
            className="inline-block px-4 py-2.5 bg-emerald-800 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            Apply now
          </Link>
        </div>
      )}

      {application && (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Status:{' '}
            <span className="font-semibold capitalize text-slate-900">
              {application.status}
            </span>
          </p>
          <p className="text-slate-500">Submitted: {new Date(application.created_at).toLocaleDateString()}</p>
          {application.reviewer_notes && (
            <p className="text-slate-600">Notes: {application.reviewer_notes}</p>
          )}
        </div>
      )}
    </main>
  )
}

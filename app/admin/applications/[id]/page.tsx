import { notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ReviewActions } from '@/components/admin/ReviewActions'
import type { ExpertApplication } from '@/lib/supabase/types'

// Signed URLs from Supabase Storage expire after 7 days by default.
// We regenerate via service role if reviewed_at is older than 6 days,
// or if there is no cached signed URL stored on the application record.
const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000

export default async function ReviewApplicationPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: app } = await (supabase as any)
    .from('expert_applications')
    .select('*')
    .eq('id', params.id)
    .single() as { data: ExpertApplication | null }

  if (!app) notFound()

  let signedUrl: string | null = null

  if (app.document_path) {
    // Determine whether the cached URL is stale.
    const reviewedAt = app.reviewed_at ? new Date(app.reviewed_at).getTime() : null
    const isStale =
      !app.document_signed_url ||
      (reviewedAt !== null && Date.now() - reviewedAt > SIX_DAYS_MS)

    if (isStale) {
      // Regenerate via service role so RLS on storage is bypassed.
      const serviceClient = await createServiceClient()
      const { data } = await serviceClient.storage
        .from('expert-documents')
        .createSignedUrl(app.document_path, 600) // 10-minute expiry
      signedUrl = data?.signedUrl ?? null
    } else {
      signedUrl = app.document_signed_url
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Review Application
      </h1>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6 space-y-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Application ID</p>
          <p className="text-sm font-mono text-gray-700 dark:text-gray-300 mt-0.5">{app.id}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Specialty</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">
            {app.specialty ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Status</p>
          <p className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-200 mt-0.5">
            {app.status}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Submitted</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">
            {new Date(app.created_at).toLocaleString()}
          </p>
        </div>
        {app.reviewer_notes && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Reviewer Notes</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 whitespace-pre-wrap">
              {app.reviewer_notes}
            </p>
          </div>
        )}
        {signedUrl ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View Credential Document ↗
          </a>
        ) : (
          <p className="text-sm text-gray-400 italic">No document uploaded.</p>
        )}
      </section>

      {app.status === 'pending' && <ReviewActions applicationId={app.id} />}
    </div>
  )
}

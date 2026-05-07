import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApplyExpertForm } from './ApplyExpertForm'
import type { ApplicationStatus, ExpertApplication } from '@/lib/supabase/types'

const STATUS_LABELS: Record<ApplicationStatus, { label: string; classes: string }> = {
  pending:  { label: 'Under review',  classes: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200' },
  approved: { label: 'Approved',      classes: 'bg-green-50  dark:bg-green-950/30  border-green-200  dark:border-green-800  text-green-800  dark:text-green-200' },
  rejected: { label: 'Not approved',  classes: 'bg-red-50    dark:bg-red-950/30    border-red-200    dark:border-red-800    text-red-800    dark:text-red-200' },
}

export default async function ApplyExpertPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check for existing application (maybeSingle returns null when not found, not an error)
  const { data: applicationRaw } = await supabase
    .from('expert_applications')
    .select('status, specialty, created_at, reviewed_at, reviewer_notes')
    .eq('user_id', user.id)
    .maybeSingle()

  const application = applicationRaw as Pick<ExpertApplication, 'status' | 'specialty' | 'created_at' | 'reviewed_at' | 'reviewer_notes'> | null

  const locked = application?.status === 'pending' || application?.status === 'approved'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Apply as Expert
        </h1>

        {/* Existing application status */}
        {application && (
          <div
            className={`mb-6 p-4 border rounded-lg ${STATUS_LABELS[application.status].classes}`}
            role="status"
            aria-live="polite"
          >
            <p className="font-medium text-sm">
              Status: {STATUS_LABELS[application.status].label}
            </p>
            <p className="text-xs mt-1 opacity-80">
              Specialty: {application.specialty}
            </p>
            {application.reviewed_at && (
              <p className="text-xs mt-1 opacity-80">
                Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}
              </p>
            )}
            {application.reviewer_notes && (
              <p className="text-xs mt-2 italic opacity-80">
                &ldquo;{application.reviewer_notes}&rdquo;
              </p>
            )}
          </div>
        )}

        {locked ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
            {application!.status === 'pending'
              ? 'Your application is currently under review. We will notify you once a decision is made.'
              : 'Your expert application has been approved. Welcome to the team!'}
          </p>
        ) : (
          <ApplyExpertForm />
        )}
      </div>
    </div>
  )
}

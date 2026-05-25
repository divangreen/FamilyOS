'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ReviewActionsProps {
  applicationId: string
}

export function ReviewActions({ applicationId }: ReviewActionsProps) {
  const router = useRouter()
  const [note, setNote]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)

  async function submit(decision: 'approved' | 'rejected') {
    if (decision === 'rejected' && !note.trim()) {
      setError('Reviewer notes are required when rejecting an application.')
      return
    }
    setError('')
    setLoading(decision)

    try {
      // The PATCH /api/expert/review route expects:
      //   { applicationId: string, decision: ApplicationStatus, notes?: string }
      const res = await fetch('/api/expert/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          decision,
          notes: note.trim() || undefined,
        }),
      })

      if (res.ok) {
        router.push('/admin/applications')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reviewer notes (required for rejection, optional for approval)"
        rows={3}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => submit('approved')}
          disabled={!!loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          {loading === 'approved' ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={() => submit('rejected')}
          disabled={!!loading}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-red-700 dark:hover:bg-red-600"
        >
          {loading === 'rejected' ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  )
}

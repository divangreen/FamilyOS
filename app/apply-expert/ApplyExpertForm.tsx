'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ApplyExpertForm() {
  const router = useRouter()
  const [specialty, setSpecialty] = useState('')
  const [document, setDocument] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!specialty.trim() || !document) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (document.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB')
      setLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('specialty', specialty.trim())
      formData.append('document', document)

      const res = await fetch('/api/expert/apply', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = (await res.json()) as { error: string }
        throw new Error(data.error ?? 'Failed to submit')
      }

      setSuccess(true)
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center"
        role="status"
      >
        <p className="text-emerald-800 font-semibold text-sm">
          ✓ Application submitted! We&apos;ll review it shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Expert application form">
      {error && (
        <div
          className="p-3 bg-red-50 border border-red-200 rounded-xl"
          role="alert"
        >
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="specialty"
          className="block text-sm font-medium text-slate-700 mb-1 ui-sans"
        >
          Specialty / Area of Expertise
        </label>
        <input
          id="specialty"
          type="text"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="e.g., Postpartum mental health"
          disabled={loading}
          required
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
        />
      </div>

      <div>
        <label
          htmlFor="document"
          className="block text-sm font-medium text-slate-700 mb-1 ui-sans"
        >
          Supporting Document
          <span className="text-xs text-slate-400 ml-1">(PDF or image, max 10 MB)</span>
        </label>
        <input
          id="document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
          disabled={loading}
          required
          aria-describedby="document-hint"
          className="w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100 disabled:opacity-50"
        />
        <p id="document-hint" className="text-xs text-slate-400 mt-1 ui-sans">
          Credentials, certifications, or relevant documentation
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !specialty.trim() || !document}
        className="w-full px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        {loading ? 'Submitting…' : 'Submit Application'}
      </button>

      <p className="text-xs text-slate-400 text-center ui-sans">
        Applications are reviewed by our admin team within 3–5 business days.
      </p>
    </form>
  )
}

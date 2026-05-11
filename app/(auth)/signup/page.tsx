'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/types'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<UserRole>('guardian')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            role,
          },
        },
      })

      if (signUpError) throw signUpError

      router.push('/feed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const roles: { value: UserRole; label: string }[] = [
    { value: 'mom',      label: 'Mom' },
    { value: 'dad',      label: 'Dad' },
    { value: 'guardian', label: 'Guardian' },
  ]

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8">
      <h1
        className="text-3xl font-bold text-slate-900 text-center mb-2"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Join The Village
      </h1>
      <p className="text-center text-slate-500 text-xs tracking-widest uppercase mb-6 ui-sans">
        A space for parents
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 ui-sans">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            required
            disabled={loading}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 ui-sans text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 ui-sans">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 ui-sans text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 ui-sans">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 ui-sans text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 ui-sans">
            I am a...
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={loading}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 ui-sans text-sm"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition ui-sans text-sm"
        >
          {loading ? 'Creating account...' : 'Join the Village'}
        </button>
      </form>

      <p className="text-center text-slate-500 mt-6 text-sm ui-sans">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-800 hover:underline font-medium">
          Login
        </Link>
      </p>
    </div>
  )
}

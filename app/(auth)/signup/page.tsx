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
    <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8">
      <h1
        className="text-3xl font-bold text-[var(--earth)] text-center mb-2"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Join The Village
      </h1>
      <p className="text-center text-[var(--text-muted)] text-xs tracking-widest uppercase mb-6 ui-sans">
        A space for parents
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg" role="alert">
          <p className="text-red-900 dark:text-red-100 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 ui-sans">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 ui-sans"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 ui-sans">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 ui-sans"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 ui-sans">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 ui-sans"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 ui-sans">
            I am a...
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={loading}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 ui-sans"
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
          className="w-full px-4 py-2 bg-[var(--accent)] hover:bg-[var(--clay)] disabled:opacity-50 text-white font-medium rounded-lg transition ui-sans"
        >
          {loading ? 'Creating account...' : 'Join the Village'}
        </button>
      </form>

      <p className="text-center text-[var(--text-muted)] mt-6 text-sm ui-sans">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Login
        </Link>
      </p>
    </div>
  )
}

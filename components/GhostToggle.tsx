'use client'

import { useState, useEffect, useId } from 'react'
import { Ghost } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GhostToggleProps {
  userId: string
  checked: boolean
  onChange: (checked: boolean, aliasName: string | null) => void
  disabled?: boolean
}

export function GhostToggle({ userId, checked, onChange, disabled = false }: GhostToggleProps) {
  const id = useId()
  const [aliasName, setAliasName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!checked) {
      setAliasName(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch('/api/ghost/alias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
      .then((res) => res.json())
      .then((data: { aliasName?: string; error?: string }) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
        } else {
          setAliasName(data.aliasName ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to generate alias')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [checked, userId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.checked, aliasName)
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex items-center gap-3 cursor-pointer select-none"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled || loading}
          aria-label="Post anonymously as a ghost"
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-indigo-600',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Ghost className="h-4 w-4" aria-hidden="true" />
          Post anonymously
        </span>
      </label>

      {checked && (
        <div className="ml-7 text-xs" aria-live="polite" aria-atomic="true">
          {loading && (
            <span className="text-gray-500 dark:text-gray-400">Generating alias…</span>
          )}
          {error && (
            <span className="text-red-600 dark:text-red-400" role="alert">{error}</span>
          )}
          {aliasName && !loading && (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              You&apos;ll appear as <strong>{aliasName}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

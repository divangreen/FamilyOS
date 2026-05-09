'use client'

import { useState, useEffect } from 'react'
import { Ghost } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GhostToggleProps {
  userId: string
  checked: boolean
  onChange: (checked: boolean, aliasName: string | null) => void
  disabled?: boolean
}

export function GhostToggle({ userId, checked, onChange, disabled = false }: GhostToggleProps) {
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

  function handleToggle() {
    if (disabled || loading) return
    onChange(!checked, aliasName)
  }

  return (
    <div aria-live="polite" aria-atomic="true">
      {!checked ? (
        /* Off state — subtle clickable row */
        <div
          role="checkbox"
          aria-checked={false}
          aria-label="Post anonymously as a ghost"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleToggle() } }}
          className={cn(
            'flex items-center gap-2 cursor-pointer select-none',
            'text-[var(--ghost-accent)] hover:opacity-80 transition-opacity ui-sans text-sm',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Ghost className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Post anonymously</span>
        </div>
      ) : (
        /* On state — expanded plum callout card */
        <div
          className="bg-[var(--ghost-bg)] rounded-xl p-3 transition-all duration-200 cursor-pointer"
          role="checkbox"
          aria-checked={true}
          aria-label="Ghost post enabled — click to disable"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleToggle() } }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Ghost className="h-4 w-4 text-white shrink-0" aria-hidden="true" />
            <span className="text-white text-sm ui-sans">Ghost posting on</span>
            {/* Visual toggle indicator */}
            <span className="ml-auto w-8 h-4 bg-[var(--ghost-accent)] rounded-full flex items-center justify-end pr-0.5">
              <span className="w-3 h-3 bg-white rounded-full" />
            </span>
          </div>

          <div className="text-xs ui-sans" aria-live="polite">
            {loading && (
              <span className="text-white/60">Generating your alias…</span>
            )}
            {error && (
              <span className="text-red-300" role="alert">{error}</span>
            )}
            {aliasName && !loading && (
              <span className="text-white/80">
                You&apos;ll appear as{' '}
                <strong className="text-[var(--lavender)] font-bold">{aliasName}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
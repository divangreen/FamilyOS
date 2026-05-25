'use client'

import { useState } from 'react'

type RoutineInput = {
  child_age_months: number
  wake_time:        string
  sleep_time:       string
  num_naps:         number
  feeding_type:     'breastfed' | 'formula' | 'solids' | 'mixed'
  concerns:         string
  output_format:    'table' | 'narrative'
}

export function RoutineForm() {
  const [form, setForm] = useState<RoutineInput>({
    child_age_months: 6,
    wake_time:        '07:00',
    sleep_time:       '19:00',
    num_naps:         2,
    feeding_type:     'breastfed',
    concerns:         '',
    output_format:    'table',
  })
  const [routine,  setRoutine]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  function update<K extends keyof RoutineInput>(key: K, value: RoutineInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function generate() {
    if (loading) return
    setLoading(true)
    setError(null)
    setRoutine(null)

    try {
      const res = await fetch('/api/ai/routine', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })

      const data = await res.json() as { routine?: string; error?: unknown }

      if (!res.ok) {
        setError('Failed to generate routine. Please try again.')
        return
      }

      setRoutine(data.routine ?? null)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
        {/* Age + Naps */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Child age (months)
            </label>
            <input
              type="number"
              min={0}
              max={216}
              value={form.child_age_months}
              onChange={(e) => update('child_age_months', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Number of naps
            </label>
            <input
              type="number"
              min={0}
              max={4}
              value={form.num_naps}
              onChange={(e) => update('num_naps', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Wake time
            </label>
            <input
              type="time"
              value={form.wake_time}
              onChange={(e) => update('wake_time', e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Bedtime
            </label>
            <input
              type="time"
              value={form.sleep_time}
              onChange={(e) => update('sleep_time', e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Feeding type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Feeding type
          </label>
          <select
            value={form.feeding_type}
            onChange={(e) => update('feeding_type', e.target.value as RoutineInput['feeding_type'])}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="breastfed">Breastfed</option>
            <option value="formula">Formula</option>
            <option value="solids">Solids</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        {/* Concerns */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Concerns or notes (optional)
          </label>
          <textarea
            rows={3}
            value={form.concerns}
            onChange={(e) => update('concerns', e.target.value)}
            placeholder="e.g. wakes frequently at night, resists naps…"
            maxLength={500}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
          />
        </div>

        {/* Output format */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Output format</p>
          <div className="flex gap-4">
            {(['table', 'narrative'] as const).map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="output_format"
                  value={fmt}
                  checked={form.output_format === fmt}
                  onChange={() => update('output_format', fmt)}
                  className="accent-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{fmt}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-40"
        >
          {loading ? 'Generating…' : 'Generate Routine'}
        </button>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
        )}
      </div>

      {/* Result */}
      {routine && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Your Routine</p>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {routine}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

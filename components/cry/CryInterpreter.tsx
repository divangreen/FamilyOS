'use client'

import { useCryRecorder } from '@/hooks/useCryRecorder'

const CAUSE_EMOJI: Record<string, string> = {
  hunger:          '🍼',
  pain:            '😢',
  tiredness:       '😴',
  overstimulation: '😵',
  discomfort:      '😣',
  'needs comfort':  '🤗',
}

const CONFIDENCE_COLORS = {
  high:   'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low:    'text-red-600 dark:text-red-400',
}

export function CryInterpreter() {
  const { state, seconds, result, error, startRecording, stopRecording, reset } = useCryRecorder()

  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center gap-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10">
        <div className="text-6xl">👂</div>
        <p className="text-gray-600 dark:text-gray-300 text-sm text-center max-w-xs">
          Hold your device near your baby and press Record. Best results with 5–15 seconds of clear cry audio.
        </p>
        <button
          onClick={startRecording}
          className="px-8 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-base transition-colors shadow-sm"
        >
          Start Recording
        </button>
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div className="flex flex-col items-center gap-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10">
        {/* Pulsing red dot */}
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-16 w-16 rounded-full bg-rose-400 opacity-30 animate-ping" />
          <span className="relative inline-flex h-10 w-10 rounded-full bg-rose-600" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Recording…</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{seconds}s / 15s</p>
        </div>
        {/* Progress bar */}
        <div className="w-full max-w-xs h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min((seconds / 15) * 100, 100)}%` }}
          />
        </div>
        <button
          onClick={stopRecording}
          className="px-8 py-3 rounded-2xl border-2 border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-400 font-semibold text-sm hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
        >
          Stop &amp; Analyse
        </button>
      </div>
    )
  }

  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center gap-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10">
        <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-gray-700 dark:text-gray-300 font-medium">Analysing cry pattern…</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">This usually takes 5–10 seconds</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-5 bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 p-10">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm text-red-600 dark:text-red-400 text-center">{error ?? 'Something went wrong.'}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // state === 'done'
  if (!result) return null

  const emoji = CAUSE_EMOJI[result.probable_cause.toLowerCase()] ?? '👶'
  const confidenceClass = CONFIDENCE_COLORS[result.confidence]

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-50 dark:bg-indigo-950 px-6 py-5 flex items-center gap-4">
        <span className="text-5xl">{emoji}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Most likely cause</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize mt-0.5">
            {result.probable_cause}
          </h2>
          <p className={`text-sm font-medium mt-0.5 ${confidenceClass}`}>
            {result.confidence} confidence ({result.confidence_pct}%)
          </p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Reasoning */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Reasoning</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.reasoning}</p>
        </div>

        {/* Suggestions */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">What to try</p>
          <ul className="space-y-1.5">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* When to call doctor */}
        <div className="bg-amber-50 dark:bg-amber-950 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">When to call your doctor</p>
          <p className="text-sm text-amber-800 dark:text-amber-300">{result.when_to_call_doctor}</p>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">{result.disclaimer}</p>

        {/* Record again */}
        <button
          onClick={reset}
          className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Record Again
        </button>
      </div>
    </div>
  )
}

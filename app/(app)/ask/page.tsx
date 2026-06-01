'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'

export default function AskPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer]     = useState('')
  const [sources, setSources]   = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const STARTER_QUESTIONS = [
    'When should I introduce solid foods?',
    'How do I handle toddler tantrums?',
    'What are signs of postpartum depression?',
    'How much screen time is okay for a 2-year-old?',
  ]

  async function ask(q = question) {
    if (!q.trim() || loading) return
    setLoading(true)
    setAnswer('')
    setSources([])
    setError('')

    const res = await fetch('/api/ai/ask', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question:        q,
        query_embedding: new Array(1024).fill(0),
      }),
    })

    setLoading(false)

    if (res.status === 401) {
      setError('Please log in to use Ask an Expert.')
      return
    }
    if (!res.ok) {
      setError('Something went wrong. Please try again.')
      return
    }

    const data = await res.json() as { answer?: string; sources?: { id: string; title: string }[] }
    if (data.answer) setAnswer(data.answer)
    if (data.sources) setSources(data.sources)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/feed"
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Back to feed"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Ask an Expert
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 tracking-widest uppercase ui-sans">
              Answers grounded in verified expert posts
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Input */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
          <div className="flex gap-2">
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), ask())}
              placeholder="e.g. When should I introduce solid foods?"
              rows={3}
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400 ui-sans"
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400 ui-sans">Press Enter to submit · Shift+Enter for new line</p>
            <button
              onClick={() => ask()}
              disabled={loading || !question.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors ui-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Asking…' : 'Ask'}
            </button>
          </div>
        </div>

        {/* Starter questions */}
        {!answer && !loading && (
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 ui-sans mb-2">Common questions</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuestion(q); ask(q) }}
                  className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full hover:border-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors ui-sans"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300 ui-sans">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
          </div>
        )}

        {/* Answer */}
        {answer && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ui-sans">
                Expert Answer
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-serif">
              {answer}
            </p>
            {sources.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 ui-sans mb-2">
                  Sources
                </p>
                <ul className="space-y-1">
                  {sources.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/post/${s.id}`}
                        className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline ui-sans"
                      >
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => { setAnswer(''); setSources([]); setQuestion('') }}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ui-sans transition-colors"
            >
              Ask another question
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

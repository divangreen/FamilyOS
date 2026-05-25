'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function AskPage() {
  const [question, setQuestion]   = useState('')
  const [answer, setAnswer]       = useState('')
  const [sources, setSources]     = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading]     = useState(false)

  async function ask() {
    if (!question.trim() || loading) return
    setLoading(true)
    setAnswer('')
    setSources([])

    const res = await fetch('/api/ai/ask', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        query_embedding: new Array(1024).fill(0),
      }),
    })
    const data = await res.json() as { answer?: string; sources?: { id: string; title: string }[] }
    setLoading(false)
    if (data.answer) setAnswer(data.answer)
    if (data.sources) setSources(data.sources)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pediatric Assistant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ask a parenting question — answers are grounded in expert posts on the platform.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()}
            placeholder="e.g. When should I introduce solid foods?"
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Asking…' : 'Ask'}
          </button>
        </div>

        {answer && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{answer}</p>
            {sources.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Sources</p>
                <ul className="space-y-1">
                  {sources.map((s) => (
                    <li key={s.id}>
                      <Link href={`/post/${s.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

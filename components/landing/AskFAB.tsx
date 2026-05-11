'use client'

import { useRouter } from 'next/navigation'
import { HelpCircle } from 'lucide-react'

// Floating action button — visible only on mobile (hidden lg+).
// Links unauthenticated visitors to signup with intent context.
export function AskFAB() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/signup?intent=ask')}
      aria-label="Ask a question"
      className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white pl-5 pr-6 py-4 rounded-full shadow-2xl transition-all ui-sans"
    >
      <HelpCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-sm font-semibold">Ask a Question</span>
    </button>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function HeroSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/signup?intent=search&q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <Search
          className="absolute left-5 h-5 w-5 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 5,000+ expert-verified parenting guides..."
          className="w-full pl-14 pr-36 py-5 text-base rounded-2xl border-2 border-white/20 bg-white text-slate-800 placeholder-slate-400 shadow-xl focus:outline-none focus:border-emerald-400 transition-colors ui-sans"
          aria-label="Search parenting guides"
        />
        <button
          type="submit"
          className="absolute right-2 px-5 py-3 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white text-sm font-semibold rounded-xl transition-colors ui-sans"
        >
          Search
        </button>
      </div>
    </form>
  )
}

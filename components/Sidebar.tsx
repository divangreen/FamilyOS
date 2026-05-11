'use client'

import { useRouter } from 'next/navigation'

/** Placeholder expert data — wire to real Supabase query when available */
const PLACEHOLDER_EXPERTS = [
  { name: 'Dr. Sarah M.', specialty: 'Pediatrics' },
  { name: 'James T.',     specialty: 'Child Psychology' },
  { name: 'Ana R.',       specialty: 'Nutrition' },
]

function expertInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Sidebar() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4 ui-sans">

      {/* Ghost post callout — encourages anonymous sharing */}
      <div className="bg-violet-900 rounded-2xl p-4 text-white">
        <p className="text-sm font-serif leading-relaxed mb-3 text-violet-100">
          Some things are too personal to share under your name.
        </p>
        <button
          onClick={() => router.push('/post/new?ghost=true')}
          className="text-xs bg-violet-100 text-violet-900 font-semibold px-3 py-1.5 rounded-full hover:bg-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
        >
          Try ghost posting
        </button>
      </div>

      {/* Verified experts panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3 ui-sans">
          Verified Experts
        </h3>
        {PLACEHOLDER_EXPERTS.map((e) => (
          <div key={e.name} className="flex items-center gap-2 mb-2 last:mb-0">
            {/* Expert avatar */}
            <div className="w-7 h-7 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center font-bold shrink-0">
              {expertInitials(e.name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">{e.name}</p>
              <p className="text-xs text-slate-500 truncate">{e.specialty}</p>
            </div>
            {/* Online indicator dot */}
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
          </div>
        ))}
      </div>

      {/* Village activity — placeholder stats, wire to real data later */}
      <div className="bg-slate-800 rounded-2xl p-4 text-white">
        <h3 className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-2 ui-sans">
          Village Activity
        </h3>
        <p className="text-3xl font-bold text-amber-400">47</p>
        <p className="text-xs text-slate-400 mb-3">parents online now</p>

        {/* Segmented role breakdown bar */}
        <div className="flex rounded-full overflow-hidden h-2 mb-2" role="img" aria-label="Role breakdown: 45% Moms, 35% Dads, 20% Guardians">
          <div className="bg-rose-400" style={{ width: '45%' }} />
          <div className="bg-sky-400" style={{ width: '35%' }} />
          <div className="bg-violet-400" style={{ width: '20%' }} />
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="text-xs text-slate-400">● Moms 45%</span>
          <span className="text-xs text-slate-400">● Dads 35%</span>
          <span className="text-xs text-slate-400">● Guardians 20%</span>
        </div>
      </div>

    </div>
  )
}

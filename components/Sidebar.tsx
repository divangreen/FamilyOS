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
      <div className="bg-[var(--ghost-bg)] rounded-xl p-4 text-white">
        <p className="text-sm font-serif leading-relaxed mb-3">
          Some things are too personal to share under your name.
        </p>
        <button
          onClick={() => router.push('/post/new?ghost=true')}
          className="text-xs bg-[var(--ghost-pearl)] text-[var(--ghost-accent)] px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ghost-accent)]"
        >
          Try ghost posting
        </button>
      </div>

      {/* Verified experts panel */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4">
        <h3 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Verified Experts
        </h3>
        {PLACEHOLDER_EXPERTS.map((e) => (
          <div key={e.name} className="flex items-center gap-2 mb-2 last:mb-0">
            {/* Expert avatar */}
            <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center font-bold shrink-0">
              {expertInitials(e.name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{e.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{e.specialty}</p>
            </div>
            {/* Online indicator dot */}
            <span className="ml-auto w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" aria-hidden="true" />
          </div>
        ))}
      </div>

      {/* Village activity — placeholder stats, wire to real data later */}
      <div className="bg-village-dusk rounded-xl p-4 text-white">
        <h3 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Village Activity
        </h3>
        <p className="text-3xl font-bold text-village-sun">47</p>
        <p className="text-xs text-white/60 mb-3">parents online now</p>

        {/* Segmented role breakdown bar */}
        <div className="flex rounded-full overflow-hidden h-2 mb-2" role="img" aria-label="Role breakdown: 45% Moms, 35% Dads, 20% Guardians">
          <div className="bg-[#C1440E]" style={{ width: '45%' }} />
          <div className="bg-[#1A5276]" style={{ width: '35%' }} />
          <div className="bg-[#7C4CA0]" style={{ width: '20%' }} />
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="text-xs text-white/60">● Moms 45%</span>
          <span className="text-xs text-white/60">● Dads 35%</span>
          <span className="text-xs text-white/60">● Guardians 20%</span>
        </div>
      </div>

    </div>
  )
}

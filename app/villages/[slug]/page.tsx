import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { SubVillage } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function VillagePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: rawVillage } = await supabase
    .from('sub_villages')
    .select('*')
    .eq('name', slug)
    .single()

  const village = rawVillage as unknown as SubVillage | null

  if (!village) notFound()

  // TODO: fetch paginated posts for this sub-village via public_posts view

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold text-slate-900 mb-2"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {village.name}
      </h1>
      {village.description && (
        <p className="text-slate-500 mb-6">{village.description}</p>
      )}
      {/* TODO: render PostCard list */}
      <p className="text-slate-400 text-sm ui-sans">Posts coming soon.</p>
    </main>
  )
}

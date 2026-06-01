import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MessageSquare, Clock } from 'lucide-react'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default async function TopicsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any

  const { data: subVillages } = await db
    .from('sub_villages')
    .select('id, name, description')
    .order('name') as { data: { id: string; name: string; description: string | null }[] | null }

  // Fetch all post sub_village_id values to compute counts client-side (single query)
  const { data: allPosts } = await db
    .from('public_posts')
    .select('id, sub_village_id, title, created_at') as {
      data: { id: string; sub_village_id: string; title: string; created_at: string }[] | null
    }

  const villages = subVillages ?? []
  const posts    = allPosts ?? []

  // Build per-sub-village stats
  const statsMap = new Map<string, { count: number; latestTitle: string | null; latestAt: string | null }>()

  for (const sv of villages) {
    const svPosts = posts
      .filter((p) => p.sub_village_id === sv.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    statsMap.set(sv.id, {
      count:       svPosts.length,
      latestTitle: svPosts[0]?.title ?? null,
      latestAt:    svPosts[0]?.created_at ?? null,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1
              className="text-2xl font-bold text-slate-900 dark:text-white leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              The Village
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 tracking-widest uppercase ui-sans">
              Browse Topics
            </p>
          </div>
          <Link
            href="/feed"
            className="px-3 py-1.5 bg-emerald-800 text-white hover:bg-emerald-700 rounded-lg transition text-sm ui-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            ← Back to Feed
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">

        <p className="text-sm text-slate-500 dark:text-slate-400 ui-sans mb-4">
          {villages.length} topic areas · {posts.length.toLocaleString()} posts
        </p>

        {villages.map((sv) => {
          const stats = statsMap.get(sv.id)!
          return (
            <Link
              key={sv.id}
              href={`/feed?subVillage=${sv.id}`}
              className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-emerald-600 hover:shadow-md dark:hover:border-emerald-600 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">

                {/* Left: name + description + latest post */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-emerald-800 dark:text-emerald-400 group-hover:underline ui-sans">
                    {sv.name}
                  </h2>
                  {sv.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 ui-sans mt-0.5">
                      {sv.description}
                    </p>
                  )}
                  {stats.latestTitle && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate ui-sans">
                        {stats.latestTitle}
                        {stats.latestAt && (
                          <span className="ml-1 text-slate-300 dark:text-slate-600">
                            · {timeAgo(stats.latestAt)}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: thread count */}
                <div className="flex flex-col items-center shrink-0 text-center">
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-semibold ui-sans">{stats.count.toLocaleString()}</span>
                  </div>
                  <span className="text-xs text-slate-400 ui-sans">threads</span>
                </div>

              </div>
            </Link>
          )
        })}

        {villages.length === 0 && (
          <div className="text-center py-16 text-slate-400 font-serif">
            No topics found.
          </div>
        )}

      </div>
    </div>
  )
}

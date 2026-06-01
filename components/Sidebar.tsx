'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, MessageSquare, Sparkles } from 'lucide-react'

interface SubVillageStat {
  id:        string
  name:      string
  postCount: number
}

interface TrendingPost {
  id:            string
  title:         string
  popular_count: number
}

interface SidebarProps {
  subVillages?:   SubVillageStat[]
  trendingPosts?: TrendingPost[]
}

export default function Sidebar({ subVillages = [], trendingPosts = [] }: SidebarProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4 ui-sans">

      {/* Ask an Expert CTA */}
      <div className="bg-emerald-800 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <h3 className="text-sm font-semibold">Ask an Expert</h3>
        </div>
        <p className="text-xs text-emerald-100 leading-relaxed mb-3">
          Get answers grounded in posts from verified experts on this platform.
        </p>
        <button
          onClick={() => router.push('/ask')}
          className="text-xs bg-white text-emerald-800 font-semibold px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
        >
          Ask a question →
        </button>
      </div>

      {/* Browse Topics */}
      {subVillages.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
            Browse Topics
          </h3>
          {subVillages.slice(0, 5).map((sv) => (
            <Link
              key={sv.id}
              href={`/feed?subVillage=${sv.id}`}
              className="flex items-center justify-between mb-2 last:mb-0 group"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {sv.name}
                </span>
              </div>
              <span className="text-xs text-slate-400 shrink-0 ml-2">{sv.postCount}</span>
            </Link>
          ))}
          <Link
            href="/topics"
            className="block text-xs text-emerald-700 dark:text-emerald-400 hover:underline mt-3"
          >
            Browse all topics →
          </Link>
        </div>
      )}

      {/* Trending Posts */}
      {trendingPosts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
            Trending Posts
          </h3>
          {trendingPosts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="flex items-start gap-2 mb-3 last:mb-0 group"
            >
              <Star className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {post.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{post.popular_count} ★</p>
              </div>
            </Link>
          ))}
          <Link
            href="/feed?sort=popular"
            className="block text-xs text-emerald-700 dark:text-emerald-400 hover:underline mt-1"
          >
            See all popular posts →
          </Link>
        </div>
      )}

      {/* Ghost post callout */}
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

    </div>
  )
}

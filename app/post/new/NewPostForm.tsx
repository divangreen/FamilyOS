'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GhostToggle } from '@/components/GhostToggle'
import { createClient } from '@/lib/supabase/client'
import type { SubVillage } from '@/lib/supabase/types'

interface NewPostFormProps {
  userId: string
  subVillages: Pick<SubVillage, 'id' | 'name'>[]
  defaultSubVillageId?: string
}

export function NewPostForm({ userId, subVillages, defaultSubVillageId }: NewPostFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [subVillageId, setSubVillageId] = useState(defaultSubVillageId ?? subVillages[0]?.id ?? '')
  const [isGhost, setIsGhost] = useState(false)
  const [ghostAliasId, setGhostAliasId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGhostChange(checked: boolean, aliasName: string | null) {
    setIsGhost(checked)
    if (!checked) {
      setGhostAliasId(null)
      return
    }
    if (aliasName) {
      const supabase = createClient()
      const { data } = await supabase
        .from('ghost_aliases')
        .select('id')
        .eq('user_id', userId)
        .eq('alias_name', aliasName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setGhostAliasId((data as { id?: string } | null)?.id ?? null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setSubmitting(true)
    setError(null)

    const supabase = createClient()

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: userId,
        sub_village_id: subVillageId,
        title: title.trim(),
        body: body.trim(),
        is_ghost_post: isGhost,
        ghost_alias_id: isGhost ? ghostAliasId : null,
      } as any)
      .select('id')
      .single()

    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create post')
      setSubmitting(false)
      return
    }

    router.push(`/post/${(data as any).id}`)
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      aria-label="Create a new post"
    >
      <div>
        <label
          htmlFor="post-title"
          className="block text-sm font-medium text-slate-700 mb-1.5 ui-sans"
        >
          Title
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          required
          maxLength={200}
          disabled={submitting}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 text-sm"
        />
        <p className="mt-1 text-xs text-slate-400 text-right ui-sans">{title.length}/200</p>
      </div>

      <div>
        <label
          htmlFor="post-body"
          className="block text-sm font-medium text-slate-700 mb-1.5 ui-sans"
        >
          Body
        </label>
        <textarea
          id="post-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share more details…"
          required
          rows={8}
          disabled={submitting}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 resize-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="post-subvillage"
          className="block text-sm font-medium text-slate-700 mb-1.5 ui-sans"
        >
          Sub-Village
        </label>
        <select
          id="post-subvillage"
          value={subVillageId}
          onChange={(e) => setSubVillageId(e.target.value)}
          disabled={submitting}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 text-sm"
        >
          {subVillages.map((sv) => (
            <option key={sv.id} value={sv.id}>
              {sv.name}
            </option>
          ))}
        </select>
      </div>

      <GhostToggle
        userId={userId}
        checked={isGhost}
        onChange={handleGhostChange}
        disabled={submitting}
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !body.trim()}
          className="flex-1 px-4 py-2.5 bg-emerald-800 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          {submitting ? 'Posting…' : 'Post to The Village'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

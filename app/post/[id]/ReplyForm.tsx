'use client'

import { useState } from 'react'
import type { Database } from '@/lib/supabase/types'
import { useRouter } from 'next/navigation'
import { GhostToggle } from '@/components/GhostToggle'
import { createClient } from '@/lib/supabase/client'

interface ReplyFormProps {
  postId: string
  userId: string
  parentId?: string
}

export function ReplyForm({ postId, userId, parentId }: ReplyFormProps) {
  const router = useRouter()
  const [body, setBody] = useState('')
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
      // Look up the alias UUID we just created
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
    if (!body.trim()) return

    setSubmitting(true)
    setError(null)

    const supabase = createClient()

    const { error: insertError } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          author_id: userId,
          parent_id: parentId ?? null,
          body: body.trim(),
          depth: parentId ? 1 : 0,
          is_ghost_post: isGhost,
          ghost_alias_id: isGhost ? ghostAliasId : null,
        } as Database['public']['Tables']['comments']['Insert'],
      ] as any)

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setBody('')
    setIsGhost(false)
    setGhostAliasId(null)
    router.refresh()
    setSubmitting(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900"
      aria-label="Leave a comment"
    >
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {parentId ? 'Reply' : 'Leave a comment'}
      </h3>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your thoughts…"
        rows={4}
        disabled={submitting}
        required
        aria-label="Comment text"
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm resize-y disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      />

      <GhostToggle
        userId={userId}
        checked={isGhost}
        onChange={handleGhostChange}
        disabled={submitting}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        {submitting ? 'Posting…' : 'Post comment'}
      </button>
    </form>
  )
}

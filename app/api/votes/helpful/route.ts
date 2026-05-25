import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { type Database, type TargetType } from '@/lib/supabase/types'
import { HelpfulVoteSchema } from '@/lib/validators/vote'
import { NextResponse } from 'next/server'

// Supabase SDK v2 has a known structural gap: `PostgrestQueryBuilder<Relation>` uses
// a conditional `Relation extends { Insert: unknown } ? Relation['Insert'] : never` to
// type `.insert()`. Because the class-level bound is `Relation extends GenericTable | GenericView`
// (which includes `GenericNonUpdatableView` without an Insert property), TypeScript's
// conditional-type check cannot definitively resolve to true for the type parameter,
// and falls back to `never`. The pattern below casts the builder once to a minimal
// typed interface that retains full type information without leaking `any`.

type ReputationVoteInsert = Database['public']['Tables']['reputation_votes']['Insert']
type PublicPostAuthor = Pick<Database['public']['Views']['public_posts']['Row'], 'author_id'>
type AdjustHelpfulArgs = Database['public']['Functions']['adjust_helpful_count']['Args']
type CreateNotifArgs = Database['public']['Functions']['create_notification']['Args']

interface TypedVotesTable {
  insert(row: ReputationVoteInsert): Promise<{ error: { code: string; message: string } | null }>
  delete(): {
    eq(col: keyof ReputationVoteInsert, val: string): {
      eq(col: keyof ReputationVoteInsert, val: string): {
        eq(col: keyof ReputationVoteInsert, val: string): Promise<{ error: { message: string } | null }>
      }
    }
  }
}

interface TypedPostsView {
  select(cols: 'author_id'): {
    eq(col: string, val: string): {
      single(): Promise<{ data: PublicPostAuthor | null; error: unknown }>
    }
  }
}

type TypedRpc<Args> = (fn: string, args: Args) => Promise<{ error: { message: string } | null }>

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody: unknown = await request.json()
    const parsed = HelpfulVoteSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 422 },
      )
    }

    const { post_id: targetId } = parsed.data
    const targetType: TargetType = 'post'

    const voteRow: ReputationVoteInsert = {
      voter_id: user.id,
      target_id: targetId,
      target_type: targetType,
      vote_type: 'helpful',
    }

    // Cast once to typed interface — avoids `as any` while working around the SDK gap.
    const votesTable = supabase.from('reputation_votes') as unknown as TypedVotesTable

    // Try to insert; if unique constraint fails, delete instead (toggle)
    const { error: insertError } = await votesTable.insert(voteRow)

    let voted = true

    if (insertError?.code === '23505') {
      const { error: deleteError } = await votesTable
        .delete()
        .eq('voter_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)

      if (deleteError) {
        console.error('Vote deletion error:', deleteError)
        return NextResponse.json({ error: 'Failed to toggle vote' }, { status: 500 })
      }

      voted = false
    } else if (insertError) {
      console.error('Vote insertion error:', insertError)
      return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
    }

    // Update helpful_count via typed RPC wrapper
    const delta = voted ? 1 : -1
    const adjustRpc = supabase.rpc as unknown as TypedRpc<AdjustHelpfulArgs>
    const { error: rpcError } = await adjustRpc('adjust_helpful_count', {
      p_target_id: targetId,
      p_target_type: targetType,
      p_delta: delta,
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return NextResponse.json({ error: 'Failed to update count' }, { status: 500 })
    }

    // Notification hook: notify post author on a new helpful vote
    try {
      if (voted) {
        const postsView = supabase.from('public_posts') as unknown as TypedPostsView
        const { data: post } = await postsView.select('author_id').eq('id', targetId).single()

        if (post?.author_id && post.author_id !== user.id) {
          const service = getServiceClient()
          const notifRpc = service.rpc as unknown as TypedRpc<CreateNotifArgs>
          await notifRpc('create_notification', {
            p_post_id: targetId,
            p_type: 'helpful_vote',
            p_actor_id: user.id,
          })
        }
      }
    } catch (notifErr) {
      console.error('Notification hook error:', notifErr)
      // Do not fail the request if notification creation fails
    }

    return NextResponse.json({ voted })
  } catch (err) {
    console.error('Vote route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

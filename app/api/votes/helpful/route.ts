import { createClient } from '@/lib/supabase/server'
import { type TargetType, type VoteType } from '@/lib/supabase/types'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Require authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetId, targetType } = (await request.json()) as {
      targetId: string
      targetType: TargetType
    }

    if (!targetId || !targetType) {
      return NextResponse.json(
        { error: 'Missing targetId or targetType' },
        { status: 400 }
      )
    }

    const voteType: VoteType = 'helpful'

    // Try to insert; if unique constraint fails, delete instead (toggle)
    const { data, error } = await (supabase
      .from('reputation_votes') as any)
      .insert({
        voter_id: user.id,
        target_id: targetId,
        target_type: targetType,
        vote_type: voteType,
      })
      .select()
      .single()

    let voted = true

    // If unique constraint error (23505), delete the vote
    if (error?.code === '23505') {
      const { error: deleteError } = await (supabase
        .from('reputation_votes') as any)
        .delete()
        .eq('voter_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)

      if (deleteError) {
        console.error('Vote deletion error:', deleteError)
        return NextResponse.json(
          { error: 'Failed to toggle vote' },
          { status: 500 }
        )
      }

      voted = false
    } else if (error) {
      console.error('Vote insertion error:', error)
      return NextResponse.json(
        { error: 'Failed to vote' },
        { status: 500 }
      )
    }

    // Update helpful count via RPC
    const delta = voted ? 1 : -1
    const { error: rpcError } = await (supabase as any).rpc('adjust_helpful_count', {
      p_target_id: targetId,
      p_target_type: targetType,
      p_delta: delta,
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Failed to update count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ voted })
  } catch (error) {
    console.error('Vote route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

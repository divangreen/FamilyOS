import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { postId: string; type?: string }
    if (!body?.postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 })
    }

    const service = getServiceClient()
    // Call the secure RPC to create a notification for the post's author
    const { error } = await service.rpc('create_notification', {
      p_post_id: body.postId,
      p_type: body.type || 'reply_post',
      p_actor_id: user.id,
    } as any)

    if (error) {
      console.error('create_notification RPC error:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Notifications create route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { createGhostAlias } from '@/lib/ghost'
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

    const { userId } = (await request.json()) as { userId: string }

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const aliasName = await createGhostAlias(userId)

    return NextResponse.json({ aliasName })
  } catch (error) {
    console.error('Ghost alias route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create alias' },
      { status: 500 }
    )
  }
}

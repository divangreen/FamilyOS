import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const supabase = await createClient()

    const targetId = userId || (await supabase.auth.getUser()).data.user?.id

    if (!targetId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json() as Record<string, unknown>

    const allowedFields = ['display_name', 'bio', 'avatar_url']
    const sanitized: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in updates) {
        sanitized[field] = updates[field]
      }
    }

    if (typeof sanitized.display_name === 'string' && sanitized.display_name.length > 50) {
      return NextResponse.json({ error: 'Display name too long (max 50 chars)' }, { status: 400 })
    }

    if (typeof sanitized.bio === 'string' && sanitized.bio.length > 500) {
      return NextResponse.json({ error: 'Bio too long (max 500 chars)' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update({ ...sanitized, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

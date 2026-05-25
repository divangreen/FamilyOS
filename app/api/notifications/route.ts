import { createClient } from '@/lib/supabase/server'
import { type Database } from '@/lib/supabase/types'
import { MarkReadSchema } from '@/lib/validators/notifications'
import { NextResponse } from 'next/server'

// Same Supabase SDK v2 type-parameter gap described in helpful/route.ts.
// We cast once to a typed interface that retains the full row shape.
type NotificationRow = Database['public']['Tables']['notifications']['Row']
type NotificationUpdate = Pick<Database['public']['Tables']['notifications']['Update'], 'read_at'>

interface TypedNotificationsTable {
  select(cols: string, opts?: { count?: 'exact'; head?: boolean }): {
    eq(col: string, val: string): {
      order(col: string, opts: { ascending: boolean }): {
        limit(n: number): Promise<{ data: NotificationRow[] | null; error: { message: string } | null }>
      }
      is(col: string, val: null): Promise<{ data: unknown; count: number | null; error: { message: string } | null }>
    }
  }
  update(vals: NotificationUpdate): {
    in(col: string, vals: string[]): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>
    }
    eq(col: string, val: string): {
      is(col: string, val: null): Promise<{ error: { message: string } | null }>
    }
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit') || '20')), 100)

    const notifs = supabase.from('notifications') as unknown as TypedNotificationsTable

    const { data, error } = await notifs
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Fetch notifications error:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get unread count via a separate lightweight query (benefits from partial index on read_at IS NULL)
    const { count, error: countErr } = await notifs
      .select('id', { count: 'exact', head: false })
      .eq('recipient_id', user.id)
      .is('read_at', null)

    if (countErr) {
      console.error('Unread count error:', countErr)
    }

    return NextResponse.json({ notifications: data ?? [], unreadCount: count ?? 0 })
  } catch (err) {
    console.error('Notifications GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody: unknown = await request.json()
    const parsed = MarkReadSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 422 },
      )
    }

    const { ids, markAll } = parsed.data
    const now = new Date().toISOString()

    const notifs = supabase.from('notifications') as unknown as TypedNotificationsTable

    if (ids && ids.length > 0) {
      const { error } = await notifs
        .update({ read_at: now })
        .in('id', ids)
        .eq('recipient_id', user.id)

      if (error) {
        console.error('Mark notifications error:', error)
        return NextResponse.json({ error: 'Failed to mark notifications' }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    if (markAll) {
      const { error } = await notifs
        .update({ read_at: now })
        .eq('recipient_id', user.id)
        .is('read_at', null)

      if (error) {
        console.error('Mark all notifications error:', error)
        return NextResponse.json({ error: 'Failed to mark notifications' }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Provide ids or markAll: true' }, { status: 400 })
  } catch (err) {
    console.error('Notifications PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { FeedQuerySchema } from '@/lib/validators/feed'
import { decodeCursor, encodeCursor } from '@/lib/pagination'
import type { PublicPost } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const parsed = FeedQuerySchema.safeParse({
      cursor:      searchParams.get('cursor') ?? undefined,
      limit:       searchParams.get('limit') ?? undefined,
      role:        searchParams.get('role') ?? undefined,
      search:      searchParams.get('search') ?? undefined,
      sort:        searchParams.get('sort') ?? undefined,
      sub_village: searchParams.get('sub_village') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 422 },
      )
    }

    const { cursor, limit, role, search, sort, sub_village } = parsed.data

    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('public_posts')
      .select('*')

    // Cursor-based pagination: filter rows older/smaller than cursor
    if (cursor) {
      const decoded = decodeCursor(cursor)
      if (decoded) {
        if (sort === 'helpful') {
          // For non-time sorts fall back to created_at keyset on tie-break
          query = query.lt('created_at', decoded.created_at)
        } else if (sort === 'popular') {
          query = query.lt('created_at', decoded.created_at)
        } else {
          // Default: recent — keyset on (created_at DESC, id DESC)
          query = query.or(
            `created_at.lt.${decoded.created_at},and(created_at.eq.${decoded.created_at},id.lt.${decoded.id})`,
          )
        }
      }
    }

    // Filter by role (only show non-ghost posts for role filter)
    if (role) {
      query = query
        .eq('role', role)
        .eq('is_ghost_post', false)
    }

    // Filter by sub-village
    if (sub_village) {
      query = query.eq('sub_village_id', sub_village)
    }

    // Full-text / prefix search
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    // Sort ordering
    if (sort === 'helpful') {
      query = query
        .order('helpful_count', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    } else if (sort === 'popular') {
      query = query
        .order('popular_count', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    } else {
      // 'recent' and default
      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    }

    // Fetch one extra row to determine hasNextPage
    query = query.limit(limit + 1)

    const { data, error } = await query as { data: PublicPost[] | null; error: { message: string } | null }

    if (error) {
      console.error('Feed query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 },
      )
    }

    const rows = data ?? []
    const hasNextPage = rows.length > limit
    const posts = hasNextPage ? rows.slice(0, limit) : rows

    const lastPost = posts[posts.length - 1]
    const nextCursor =
      hasNextPage && lastPost
        ? encodeCursor({ created_at: lastPost.created_at, id: lastPost.id })
        : null

    return NextResponse.json({ posts, nextCursor, hasNextPage })
  } catch (err) {
    console.error('Feed route error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

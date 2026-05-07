import { createClient } from '@/lib/supabase/server'
import { type UserRole } from '@/lib/supabase/types'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = (searchParams.get('role') as UserRole | null) || null
    const sort = searchParams.get('sort') || 'recent'
    const subVillage = searchParams.get('subVillage') || null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = 20

    const supabase = await createClient()

    let query = supabase
      .from('public_posts')
      .select('*', { count: 'exact' })

    // Filter by role (only show non-ghost posts for role filter)
    if (role && (role as string) !== 'all') {
      query = query
        .eq('role', role)
        .eq('is_ghost_post', false)
    }

    // Filter by sub-village
    if (subVillage && subVillage !== 'all') {
      query = query.eq('sub_village_id', subVillage)
    }

    // Sort
    if (sort === 'helpful') {
      query = query.order('helpful_count', { ascending: false })
    } else if (sort === 'popular') {
      query = query.order('popular_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Paginate
    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    const { data: posts, count, error } = await query

    if (error) {
      console.error('Feed query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      posts: posts || [],
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error('Feed route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [], query: '' })
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const SELECT = 'id, title, body, created_at, display_name, helpful_count, is_ghost_post'

    const { data: ftsResults, error: ftsError } = await db
      .from('public_posts')
      .select(SELECT)
      .textSearch('search_vector', query.trim(), { type: 'websearch', config: 'english' })
      .order('helpful_count', { ascending: false })
      .limit(limit)

    let results = ftsResults || []

    if (results.length === 0 && !ftsError) {
      const { data: trigramResults } = await db
        .from('public_posts')
        .select(SELECT)
        .or(`title.ilike.%${query.trim()}%,body.ilike.%${query.trim()}%`)
        .order('helpful_count', { ascending: false })
        .limit(limit)

      results = trigramResults || []
    }

    return NextResponse.json({ results, query: query.trim(), count: results.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

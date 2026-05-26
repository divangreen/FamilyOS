import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractText } from '@/lib/ai/claude'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  type RankPost = { id: string; title: string; body: string | null; helpful_count: number; popular_count: number }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('posts')
    .select('id, title, body, helpful_count, popular_count')
    .gte('created_at', since)
    .limit(50) as { data: RankPost[] | null }

  if (!posts?.length) return NextResponse.json({ scored: 0 })

  const BATCH = 10
  let scored = 0

  for (let i = 0; i < posts.length; i += BATCH) {
    const batch = posts.slice(i, i + BATCH)
    const postList = batch.map((p, idx) =>
      `[${idx}] Title: ${p.title}\nBody: ${(p.body ?? '').slice(0, 200)}\nHelpful: ${p.helpful_count}, Popular: ${p.popular_count}`
    ).join('\n\n')

    const response = await callClaude({
      system:   `You are a content quality ranker for a parenting community. Score each post 0.0–1.0 for feed ranking. Consider clarity, helpfulness, expertise signal, emotional support value. Respond ONLY with JSON array: [{"idx":0,"score":0.85},...]`,
      messages: [{ role: 'user', content: postList }],
      maxTokens: 300,
    })

    let scores: { idx: number; score: number }[] = []
    try {
      scores = JSON.parse(extractText(response).replace(/```json|```/g, '').trim()) as typeof scores
    } catch { continue }

    for (const { idx, score } of scores) {
      const post = batch[idx]
      if (!post) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('posts').update({ ai_rank_score: score }).eq('id', post.id)
      scored++
    }
  }

  return NextResponse.json({ scored })
}

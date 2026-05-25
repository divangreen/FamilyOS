import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractText } from '@/lib/ai/claude'
import { z } from 'zod'

const AskSchema = z.object({
  question:        z.string().min(5).max(1000),
  query_embedding: z.array(z.number()).length(1024),
})

const SYSTEM = `
You are a helpful parenting assistant. Answer questions using ONLY the provided context from verified expert posts.
Rules:
- If context is insufficient, say so — do not fabricate
- Cite the post title(s) you drew from
- Keep answers under 200 words
- End with: "This is general guidance. For your child's specific situation, consult your pediatrician."
`.trim()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = AskSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 422 })

  const { question, query_embedding } = parsed.data

  const { data: posts } = await supabase.rpc('match_posts' as never, {
    query_embedding,
    match_threshold: 0.75,
    match_count:     4,
  }) as { data: { id: string; title: string; body: string; author_role: string }[] | null }

  const context = (posts ?? [])
    .map((p) => `## ${p.title}\n${p.body.slice(0, 600)}`)
    .join('\n\n---\n\n')

  const prompt = context.length > 0
    ? `Context from expert posts:\n\n${context}\n\nParent's question: ${question}`
    : `No relevant expert posts found.\n\nParent's question: ${question}`

  const response = await callClaude({
    system:    SYSTEM,
    messages:  [{ role: 'user', content: prompt }],
    maxTokens: 400,
  })

  const answer = extractText(response)
  await supabase.rpc('increment_ai_usage' as never, { p_user_id: user.id, p_feature: 'ask' })

  return NextResponse.json({
    answer,
    sources: (posts ?? []).map((p) => ({ id: p.id, title: p.title })),
  })
}

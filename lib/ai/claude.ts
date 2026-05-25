const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-6-20251001'

type ClaudeMessage = { role: 'user' | 'assistant'; content: string }

export async function callClaude({
  system,
  messages,
  maxTokens = 1000,
}: {
  system:     string
  messages:   ClaudeMessage[]
  maxTokens?: number
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const res = await fetch(ANTHROPIC_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Claude API error ${res.status}: ${JSON.stringify(err)}`)
  }

  return res.json() as Promise<{
    content: { type: string; text: string }[]
    stop_reason: string
  }>
}

export function extractText(response: { content: { type: string; text: string }[] }): string {
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}

import { callClaude, extractText } from './claude'

export type ModerationResult = {
  approved:  boolean
  flags:     string[]
  reason:    string | null
  severity:  'none' | 'low' | 'medium' | 'high'
}

const SYSTEM = `
You are a content moderation AI for a parenting community platform.
Evaluate the submitted content and respond ONLY with valid JSON in this exact shape:
{"approved":true,"flags":[],"reason":null,"severity":"none"}

Flag and set approved=false for:
- Medical misinformation (dangerous advice about infant medication, vaccines, unsafe sleep)
- Content that could endanger a child's safety
- Hate speech, discrimination, or personal attacks
- Sexual content
- Spam or advertising

Severity: "none", "low" (mildly off-topic), "medium" (guideline violation), "high" (dangerous/harmful).
For low severity, approved may still be true with a flag for human review.
Be permissive for venting, emotional expression, and honest parenting struggles — this is a support community.
`.trim()

export async function moderateContent(text: string): Promise<ModerationResult> {
  try {
    const response = await callClaude({
      system:    SYSTEM,
      messages:  [{ role: 'user', content: `Content to review:\n\n${text.slice(0, 2000)}` }],
      maxTokens: 200,
    })
    const raw = extractText(response)
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as ModerationResult
  } catch {
    console.error('[moderation] AI call failed — defaulting to approved')
    return { approved: true, flags: ['moderation_ai_failed'], reason: null, severity: 'low' }
  }
}

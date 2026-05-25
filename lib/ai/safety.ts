export function appendSafetyDisclaimer(text: string, type: 'medical' | 'mental_health'): string {
  const disclaimers = {
    medical:       '\n\n_This is general information only — not a medical diagnosis. Always consult your pediatrician._',
    mental_health: '\n\n_If you are experiencing a crisis, please contact a mental health professional or call a helpline._',
  }
  return text + disclaimers[type]
}

export const CRISIS_KEYWORDS = [
  'kill myself', 'end it', 'not worth living', 'hurt my baby',
  "can't go on", 'want to die', 'suicide', 'harm myself',
]

export function isCrisisMessage(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw))
}

import { createClient } from './supabase/server'
import { ADJECTIVES, ANIMALS } from './wordlists'

function generateAliasName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  const num = Math.floor(Math.random() * 90) + 10 // 10–99
  return `${adj}${animal}${num}`
}

const MAX_ATTEMPTS = 5

export async function createGhostAlias(userId: string): Promise<string> {
  const supabase = await createClient()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Exponential backoff: skip delay on first attempt
    if (attempt > 0) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, 50 * Math.pow(2, attempt)),
      )
    }

    const aliasName = generateAliasName()

    const { error } = await supabase
      .from('ghost_aliases')
      .insert({ user_id: userId, alias_name: aliasName })

    if (!error) return aliasName

    // Unique constraint violation — retry with a new name
    if (error.code !== '23505') throw error
  }

  throw new Error(
    `Failed to generate a unique ghost alias after ${MAX_ATTEMPTS} attempts. ` +
    'The alias pool may be exhausted — please contact support.',
  )
}

export async function getOrCreateGhostAlias(userId: string): Promise<{ id: string; alias_name: string }> {
  const supabase = await createClient()

  // Check for a recent alias (reuse within same session is fine)
  const { data: existing } = await supabase
    .from('ghost_aliases')
    .select('id, alias_name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing

  const alias_name = await createGhostAlias(userId)

  const { data, error } = await supabase
    .from('ghost_aliases')
    .select('id, alias_name')
    .eq('user_id', userId)
    .eq('alias_name', alias_name)
    .single()

  if (error || !data) throw new Error('Failed to fetch new ghost alias')
  return data
}

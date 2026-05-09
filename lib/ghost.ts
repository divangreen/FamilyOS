import { createClient } from './supabase/server'
import { ADJECTIVES, ANIMALS } from './wordlists'

function generateAliasName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  const num = Math.floor(Math.random() * 90) + 10 // 10–99
  return `${adj}${animal}${num}`
}

export async function createGhostAlias(userId: string): Promise<string> {
  const supabase = await createClient()

  let aliasName: string
  let attempts = 0

  // Retry up to 5 times to get a unique alias
  do {
    aliasName = generateAliasName()
    attempts++

    const { error } = await supabase
      .from('ghost_aliases')
      .insert({ user_id: userId, alias_name: aliasName } as any)

    if (!error) return aliasName

    // Unique constraint violation — try again
    if (error.code !== '23505') throw error
  } while (attempts < 5)

  throw new Error('Failed to generate unique ghost alias after 5 attempts')
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

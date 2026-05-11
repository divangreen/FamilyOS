import { ADJECTIVES, ANIMALS } from './wordlists'

// XOR four 32-bit segments of a UUID hex string into a stable unsigned 32-bit integer.
function uuidToUint32(uuid: string): number {
  const hex = uuid.replace(/-/g, '')
  const a = parseInt(hex.slice(0, 8), 16)
  const b = parseInt(hex.slice(8, 16), 16)
  const c = parseInt(hex.slice(16, 24), 16)
  const d = parseInt(hex.slice(24, 32), 16)
  return (a ^ b ^ c ^ d) >>> 0 // unsigned right-shift keeps it in [0, 2^32)
}

// Returns the same alias string for a given UUID on every call —
// matches the generate_alias() Postgres function in migration 002.
export function generateAlias(uuid: string): string {
  const h = uuidToUint32(uuid)
  const adjLen = ADJECTIVES.length
  const animalLen = ANIMALS.length
  const adj = ADJECTIVES[h % adjLen]
  const animal = ANIMALS[Math.floor(h / adjLen) % animalLen]
  const num = 10 + (h % 90)
  return `${adj}${animal}${num}`
}

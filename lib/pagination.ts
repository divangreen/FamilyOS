export type Cursor = { created_at: string; id: string }

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCursor(encoded: string): Cursor | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8')
    const parsed = JSON.parse(json) as unknown
    if (
      typeof parsed === 'object' && parsed !== null &&
      'created_at' in parsed && 'id' in parsed &&
      typeof (parsed as Record<string, unknown>).created_at === 'string' &&
      typeof (parsed as Record<string, unknown>).id === 'string'
    ) {
      return parsed as Cursor
    }
    return null
  } catch {
    return null
  }
}

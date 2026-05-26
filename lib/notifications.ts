import { createClient } from '@/lib/supabase/server'
import type { NotificationType, TargetType } from '@/lib/supabase/types'

type NotificationPayload = {
  recipient_id: string
  type:         NotificationType
  actor_id?:    string | null
  target_id:    string
  target_type:  TargetType
}

export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('notifications')
      .insert(payload)
    if (error) console.error('[notifications] insert failed:', error.message)
  } catch (err) {
    console.error('[notifications] unexpected error:', err)
  }
}

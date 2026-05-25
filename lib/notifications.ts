import { createClient } from '@/lib/supabase/server'

type NotificationPayload = {
  recipient_id:   string
  type:           string
  actor_id?:      string
  target_id?:     string
  target_type?:   string
  post_title?:    string
  actor_name?:    string
}

export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('notifications' as never)
      .insert(payload)
    if (error) console.error('[notifications] insert failed:', error.message)
  } catch (err) {
    console.error('[notifications] unexpected error:', err)
  }
}

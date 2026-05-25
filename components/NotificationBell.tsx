'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

interface NotificationItemType {
  id: string
  type: string
  target_id?: string
  post_title?: string
  actor_name?: string
  created_at: string
  read_at?: string | null
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItemType[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 30000)
    return () => clearInterval(id)
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch (err) {
      console.error(err)
    }
  }

  async function markAsRead(ids?: string[]) {
    setLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids ? { ids } : { markAll: true }),
      })
      await fetchNotifications()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-8 text-gray-500 text-center">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={async () => {
                      if (!n.read_at) {
                        await markAsRead([n.id])
                      }
                      if (n.target_id) window.location.href = `/post/${n.target_id}`
                    }}
                    className={`block p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                      !n.read_at ? 'bg-blue-50' : ''
                    }`}
                  >
                    <p className="text-sm">
                      {n.type === 'reply_post'
                        ? `${n.actor_name ?? 'Someone'} replied to your post "${n.post_title ?? ''}"`
                        : n.type === 'helpful_vote'
                        ? `${n.actor_name ?? 'Someone'} found your post helpful: "${n.post_title ?? ''}"`
                        : 'New notification'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import { useAuthStore } from '../store/authStore'
import type { Notification } from '../types'

async function loadNotifications(userId: string) {
  const { data } = await localDb
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)

  return (data ?? []) as Notification[]
}

export function useNotifications() {
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const list = await loadNotifications(user.id)
    setNotifications(list)
    setUnreadCount(list.filter((notification) => !notification.is_read).length)
  }, [user])

  const markAllRead = useCallback(async () => {
    if (!user) return

    await localDb
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })))
    setUnreadCount(0)
  }, [user])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user) {
        if (!cancelled) {
          setNotifications([])
          setUnreadCount(0)
        }
        return
      }

      const list = await loadNotifications(user.id)
      if (cancelled) return
      setNotifications(list)
      setUnreadCount(list.filter((notification) => !notification.is_read).length)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [user])

  return { notifications, unreadCount, refetch: fetchNotifications, markAllRead }
}

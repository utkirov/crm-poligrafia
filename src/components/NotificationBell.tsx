import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import { BellIcon } from './icons'
import { formatDateTime } from '../utils/format'
import { useT } from '../i18n'

export function NotificationBell() {
  const navigate = useNavigate()
  const t = useT()
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
          unreadCount > 0
            ? 'text-white hover:bg-white/[0.08] animate-bell-shake'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
        }`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse-dot" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.notifications.title}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer transition-colors"
              >
                {t.notifications.markAll}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">{t.notifications.noItems}</p>
            )}
            {notifications.map((n, i) => (
              <div
                key={n.id}
                onClick={() => { if (n.order_id) { navigate(`/orders/${n.order_id}`); setOpen(false) } }}
                className={`px-4 py-3 text-sm transition-colors animate-fade-in-up ${
                  i === 0 ? 'delay-0' : i === 1 ? 'delay-50' : i === 2 ? 'delay-100' : 'delay-150'
                } ${n.order_id ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : ''} ${
                  !n.is_read ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 shrink-0 animate-pulse-dot" />}
                  <div className={!n.is_read ? '' : 'ml-4'}>
                    <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed">{n.message}</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{formatDateTime(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

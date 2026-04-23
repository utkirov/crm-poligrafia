import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { useT } from '../i18n'
import { KanbanView } from './dashboard/KanbanView'
import { ListView } from './dashboard/ListView'
import { CalendarView } from './dashboard/CalendarView'
import { Button } from '../components/Button'
import { KanbanSkeleton } from '../components/Skeleton'

type View = 'kanban' | 'list' | 'calendar'

export function DashboardPage() {
  const navigate = useNavigate()
  const t        = useT()
  const { orders, loading, error } = useOrders()
  const [view, setView] = useState<View>('kanban')

  const viewLabels: Record<View, string> = {
    kanban:   t.dashboard.kanban,
    list:     t.dashboard.list,
    calendar: t.dashboard.calendar,
  }

  const viewIcons: Record<View, React.ReactNode> = {
    kanban: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    list: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    calendar: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  }

  return (
    <div className="flex flex-col h-full page-enter">
      {/* Topbar */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 md:gap-4 transition-colors duration-200">
        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {t.dashboard.title}
        </h1>
        <div className="flex items-center gap-2 md:gap-3">
          {/* View switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
            {(['kanban', 'list', 'calendar'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  view === v
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm shadow-slate-200 dark:shadow-slate-900'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {viewIcons[v]}
                <span className="hidden sm:inline">{viewLabels[v]}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => navigate('/orders/create')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{t.dashboard.createOrder}</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        {loading && <KanbanSkeleton />}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 text-sm">
            {t.dashboard.loadError}: {error}
          </div>
        )}
        {!loading && !error && (
          <>
            {view === 'kanban'   && <KanbanView  orders={orders} />}
            {view === 'list'     && <ListView    orders={orders} />}
            {view === 'calendar' && <CalendarView orders={orders} />}
          </>
        )}
      </div>
    </div>
  )
}

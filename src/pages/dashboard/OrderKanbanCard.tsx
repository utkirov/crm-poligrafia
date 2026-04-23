import { useNavigate } from 'react-router-dom'
import type { OrderWithClient } from '../../types'
import { PriorityBadge } from '../../components/PriorityBadge'
import { formatDate, isOverdue } from '../../utils/format'
import { useT } from '../../i18n'

interface Props {
  order: OrderWithClient
}

export function OrderKanbanCard({ order }: Props) {
  const t = useT()
  const navigate = useNavigate()
  const overdue = isOverdue(order.deadline)

  return (
    <div
      onClick={() => navigate(`/orders/${order.id}`)}
      className={`
        group bg-white dark:bg-slate-800 rounded-xl border cursor-pointer
        transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60
        ${overdue
          ? 'border-l-[3px] border-l-red-400 border-r-slate-200 dark:border-r-slate-700 border-t-slate-200 dark:border-t-slate-700 border-b-slate-200 dark:border-b-slate-700 shadow-sm shadow-red-50 dark:shadow-none'
          : 'border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'
        }
      `}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-medium">#{order.order_number}</span>
          <div className="flex items-center gap-1 shrink-0">
            {order.is_urgent && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-800 uppercase tracking-wide">
                {t.common.urgent}
              </span>
            )}
            <PriorityBadge priority={order.priority} />
          </div>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {order.title}
        </p>

        {/* Client */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[8px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
            {order.client?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{order.client?.name ?? '—'}</p>
        </div>

        {/* Deadline */}
        {order.deadline && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={`text-[11px] font-medium ${overdue ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {formatDate(order.deadline)}
              {overdue && ` · ${t.kanban.overdue}`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

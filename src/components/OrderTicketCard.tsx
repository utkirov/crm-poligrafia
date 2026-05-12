import { Link } from 'react-router-dom'
import { formatDate } from '../utils/format'
import type { OrderTicketDetail } from '../types'
import { OrderTicketStatusBadge } from './OrderTicketStatusBadge'
import { useSettingsStore } from '../store/settingsStore'

const COPY = {
  ru: {
    order: 'Заказ',
    manager: 'Менеджер',
    designer: 'Дизайнер',
    deadline: 'Дедлайн',
    noDeadline: 'Не указан',
  },
  uz: {
    order: 'Buyurtma',
    manager: 'Menejer',
    designer: 'Dizayner',
    deadline: 'Muddat',
    noDeadline: "Ko'rsatilmagan",
  },
} as const

export function OrderTicketCard({ ticket }: { ticket: OrderTicketDetail }) {
  const locale = useSettingsStore((state) => state.locale)
  const copy = COPY[locale]

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{ticket.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {copy.order}: #{ticket.order.order_number} {ticket.order.title}
          </p>
        </div>
        <OrderTicketStatusBadge status={ticket.status} />
      </div>

      {ticket.description ? (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">{ticket.description}</p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
        <div>
          <p className="text-slate-400 dark:text-slate-500">{copy.manager}</p>
          <p className="text-slate-700 dark:text-slate-200">{ticket.manager_assignee.name}</p>
        </div>
        <div>
          <p className="text-slate-400 dark:text-slate-500">{copy.designer}</p>
          <p className="text-slate-700 dark:text-slate-200">{ticket.designer_assignee.name}</p>
        </div>
        <div>
          <p className="text-slate-400 dark:text-slate-500">{copy.deadline}</p>
          <p className="text-slate-700 dark:text-slate-200">
            {ticket.deadline ? formatDate(ticket.deadline) : copy.noDeadline}
          </p>
        </div>
      </div>
    </Link>
  )
}

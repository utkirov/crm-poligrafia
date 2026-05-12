import { useMemo, useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { OrderTicketCard } from '../components/OrderTicketCard'
import { Spinner } from '../components/Spinner'
import { useOrderTickets } from '../hooks/useOrderTickets'
import { useSettingsStore } from '../store/settingsStore'

const COPY = {
  ru: {
    title: 'Тикеты',
    all: 'Все',
    new: 'Новые',
    in_progress: 'В работе',
    done: 'Готово',
    noTickets: 'Тикетов пока нет',
    noTicketsHint: 'Создайте тикет из карточки заказа, чтобы передать работу менеджеру и дизайнеру.',
  },
  uz: {
    title: 'Tiketlar',
    all: 'Barchasi',
    new: 'Yangi',
    in_progress: 'Ishda',
    done: 'Tayyor',
    noTickets: 'Tiketlar yo‘q',
    noTicketsHint: 'Ishni menejer va dizaynerga topshirish uchun buyurtma kartasidan tiket yarating.',
  },
} as const

type StatusFilter = 'all' | 'new' | 'in_progress' | 'done'

export function OrderTicketsPage() {
  const locale = useSettingsStore((state) => state.locale)
  const copy = COPY[locale]
  const { tickets, loading, error } = useOrderTickets()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredTickets = useMemo(() => {
    if (statusFilter === 'all') {
      return tickets
    }

    return tickets.filter((ticket) => ticket.status === statusFilter)
  }, [statusFilter, tickets])

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs items={[{ label: copy.title }]} />
        <div className="flex items-center justify-between mt-2 gap-4 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{copy.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'new', 'in_progress', 'done'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {copy[value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner className="w-7 h-7 text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.noTickets}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{copy.noTicketsHint}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredTickets.map((ticket) => (
              <OrderTicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

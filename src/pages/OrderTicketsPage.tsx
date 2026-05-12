import { useMemo, useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { OrderTicketCard } from '../components/OrderTicketCard'
import { Spinner } from '../components/Spinner'
import { useOrderTickets } from '../hooks/useOrderTickets'
import { useAuthStore } from '../store/authStore'
import { useT } from '../i18n'

type StatusFilter = 'all' | 'new' | 'in_progress' | 'done'

export function OrderTicketsPage() {
  const t = useT()
  const user = useAuthStore((state) => state.user)
  const { tickets, loading, error } = useOrderTickets()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')

  const isDirector = user?.role === 'director'

  // Collect unique assignees for the filter dropdown (directors only)
  const assigneeOptions = useMemo(() => {
    if (!isDirector) return []
    const seen = new Map<string, string>()
    for (const ticket of tickets) {
      if (ticket.manager_assignee?.id) seen.set(ticket.manager_assignee.id, ticket.manager_assignee.name)
      if (ticket.designer_assignee?.id) seen.set(ticket.designer_assignee.id, ticket.designer_assignee.name)
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [tickets, isDirector])

  const filteredTickets = useMemo(() => {
    let list = tickets

    if (statusFilter !== 'all') {
      list = list.filter((ticket) => ticket.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(q) ||
          ticket.order?.title?.toLowerCase().includes(q) ||
          ticket.manager_assignee?.name.toLowerCase().includes(q) ||
          ticket.designer_assignee?.name.toLowerCase().includes(q),
      )
    }

    if (assigneeFilter) {
      list = list.filter(
        (ticket) =>
          ticket.manager_assignee?.id === assigneeFilter ||
          ticket.designer_assignee?.id === assigneeFilter,
      )
    }

    return list
  }, [statusFilter, search, assigneeFilter, tickets])

  const statusButtons: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t.ticketsPage.all },
    { value: 'new', label: t.ticketsPage.filterNew },
    { value: 'in_progress', label: t.ticketsPage.filterInProgress },
    { value: 'done', label: t.ticketsPage.filterDone },
  ]

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs items={[{ label: t.ticketsPage.title }]} />
        <div className="flex items-center justify-between mt-2 gap-4 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.ticketsPage.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {statusButtons.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and assignee filters */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.ticketsPage.searchPlaceholder}
            className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isDirector && assigneeOptions.length > 0 && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">{t.ticketsPage.allAssignees}</option>
              {assigneeOptions.map(({ id, name }) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          )}
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
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.ticketsPage.noTickets}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t.ticketsPage.noTicketsHint}</p>
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

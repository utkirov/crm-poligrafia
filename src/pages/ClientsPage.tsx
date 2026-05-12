import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { localDb } from '../lib/localDb'
import { useClients } from '../hooks/useClients'
import { toastSuccess, toastError } from '../lib/toast'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ClientFormModal } from '../components/ClientFormModal'
import { EmptyState } from '../components/EmptyState'
import { Pagination } from '../components/Pagination'
import { TableSkeleton } from '../components/Skeleton'
import { formatCurrency, formatDate } from '../utils/format'
import { useT } from '../i18n'
import type { Client, ClientType } from '../types'

const PAGE_SIZE = 20

const TYPE_COLORS: Record<ClientType, 'blue' | 'purple' | 'teal'> = {
  individual: 'blue',
  company: 'purple',
  agent: 'teal',
}

export function ClientsPage() {
  const navigate = useNavigate()
  const t = useT()
  const { clients, loading, refetch } = useClients()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ClientType | ''>('')
  const [showArchived, setShowArchived] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [page, setPage] = useState(1)


  const typeLabels: Record<ClientType, string> = {
    individual: t.clientType.individual,
    company: t.clientType.company,
    agent: t.clientType.agent,
  }

  const visibleClients = showArchived ? clients : clients.filter((client) => !client.is_archived)
  const filteredClients = visibleClients
    .filter((client) => !typeFilter || client.type === typeFilter)
    .filter((client) => {
      if (!search) return true
      const query = search.toLowerCase()
      return client.name.toLowerCase().includes(query) || client.phone?.includes(query)
    })

  const activeCount = clients.filter((client) => !client.is_archived).length
  const archivedCount = clients.filter((client) => client.is_archived).length

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE)
  const paginatedClients = filteredClients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, typeFilter, showArchived])

  const handleArchive = async (client: Client) => {
    const { error } = await localDb.from('clients').update({ is_archived: true }).eq('id', client.id)
    if (error) {
      toastError(t.clients.archiveError)
      return
    }

    toastSuccess(`${client.name} ${t.clients.archived}`)
    refetch()
  }

  const handleRestore = async (client: Client) => {
    const { error } = await localDb.from('clients').update({ is_archived: false }).eq('id', client.id)
    if (error) {
      toastError(t.clients.restoreError)
      return
    }

    toastSuccess(`${client.name} ${t.clients.restored}`)
    refetch()
  }

  const typeFilters: Array<[ClientType | '', string]> = [
    ['', t.common.all],
    ['individual', t.clientType.individual],
    ['company', t.clientType.company],
    ['agent', t.clientType.agent],
  ]

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 transition-colors duration-200">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.nav.clients}</h1>
        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-sm">
          <input
            type="text"
            placeholder={t.clients.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1 min-w-0 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        <Button onClick={() => { setEditClient(null); setModalOpen(true) }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">{t.clients.newClient}</span>
        </Button>
      </div>

      <div className="flex-1 p-4 md:p-6">
        <div className="flex gap-2 mb-4 flex-wrap">
          {typeFilters.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                typeFilter === value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filteredClients.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <EmptyState
              title={t.clients.noClients}
              description={search ? t.clients.searchPlaceholder : t.common.noData}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.clients.colClient}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.clients.colType}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.clients.colPhone}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.clients.colLastOrder}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.clients.colCashback}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.clients.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${client.is_archived ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.name} type={client.type} size="sm" />
                        <span
                          className="font-medium text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          {client.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={TYPE_COLORS[client.type]}>{typeLabels[client.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{client.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-500">{formatDate(client.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(client.cashback_balance)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {t.common.open}
                        </button>
                        {!client.is_archived ? (
                          <button
                            onClick={() => { setEditClient(client); setModalOpen(true) }}
                            className="text-xs text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                          >
                            {t.common.edit}
                          </button>
                        ) : null}
                        {!client.is_archived ? (
                          <button
                            onClick={() => handleArchive(client)}
                            className="text-xs text-red-500 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            {t.clients.archive}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(client)}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            {t.clients.restore}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              totalItems={filteredClients.length}
              pageSize={PAGE_SIZE}
            />

            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {activeCount} {t.clients.active} · {archivedCount} {t.clients.archiveLabel}
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(event) => setShowArchived(event.target.checked)}
                  className="rounded"
                />
                {t.clients.showArchived}
              </label>
            </div>
          </div>
        )}
      </div>

      <ClientFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditClient(null) }}
        onSaved={refetch}
        initial={editClient}
      />
    </div>
  )
}

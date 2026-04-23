import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { OrderWithClient } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { PriorityBadge } from '../../components/PriorityBadge'
import { formatDate, formatCurrency, isOverdue } from '../../utils/format'
import { STATUS_LABELS, PRIORITY_LABELS } from '../../utils/orderUtils'
import { useT } from '../../i18n'
import { supabase } from '../../lib/supabase'
import { toastSuccess, toastError } from '../../lib/toast'

type SortKey = 'order_number' | 'title' | 'deadline' | 'total_amount' | 'status' | 'priority'

interface Props { orders: OrderWithClient[] }

const todayStr = new Date().toISOString().slice(0, 10)

const isOldCompleted = (o: OrderWithClient) =>
  o.status === 'completed' && (o.updated_at ?? o.created_at)?.slice(0, 10) < todayStr

export function ListView({ orders: propOrders }: Props) {
  const navigate      = useNavigate()
  const t             = useT()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusFilter   = searchParams.get('status')   ?? ''
  const priorityFilter = searchParams.get('priority') ?? ''
  const search         = searchParams.get('q')        ?? ''
  const sortKey        = (searchParams.get('sort') ?? 'order_number') as SortKey
  const sortAsc        = searchParams.get('asc') === 'true'

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const toggleSort = (key: SortKey) => {
    const next = new URLSearchParams(searchParams)
    if (sortKey === key) next.set('asc', String(!sortAsc))
    else { next.set('sort', key); next.set('asc', 'true') }
    setSearchParams(next, { replace: true })
  }

  const [orders,          setOrders]          = useState(propOrders)
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [updatingId,      setUpdatingId]      = useState<string | null>(null)
  const [showOldCompleted, setShowOldCompleted] = useState(false)

  useState(() => { setOrders(propOrders) })

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus as any } : o))
    setEditingStatusId(null)
    const db = supabase as any
    const { error } = await db.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) { toastError(t.kanban.updateError); setOrders(propOrders) }
    else toastSuccess(t.common.save)
    setUpdatingId(null)
  }

  const oldCompleted  = orders.filter(isOldCompleted)
  const activeOrders  = orders.filter((o) => !isOldCompleted(o))

  const statusOptions = [
    { value: '', label: t.dashboard.allStatuses },
    ...Object.entries(STATUS_LABELS)
      .filter(([k]) => k !== 'cancelled')
      .map(([value]) => ({ value, label: (t.status as any)[value] ?? value })),
  ]

  const priorityOptions = [
    { value: '', label: t.dashboard.allPriorities },
    ...Object.entries(PRIORITY_LABELS)
      .map(([value]) => ({ value, label: (t.priority as any)[value] ?? value })),
  ]

  const applyFilters = (list: OrderWithClient[]) =>
    list
      .filter((o) => !statusFilter   || o.status   === statusFilter)
      .filter((o) => !priorityFilter || o.priority === priorityFilter)
      .filter((o) => {
        if (!search) return true
        const q = search.toLowerCase()
        return o.title.toLowerCase().includes(q) || o.client?.name?.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        let cmp = 0
        if      (sortKey === 'order_number') cmp = (a.order_number ?? 0) - (b.order_number ?? 0)
        else if (sortKey === 'title')        cmp = a.title.localeCompare(b.title)
        else if (sortKey === 'deadline')     cmp = (a.deadline ?? '').localeCompare(b.deadline ?? '')
        else if (sortKey === 'total_amount') cmp = a.total_amount - b.total_amount
        else if (sortKey === 'status')       cmp = a.status.localeCompare(b.status)
        else if (sortKey === 'priority')     cmp = a.priority.localeCompare(b.priority)
        return sortAsc ? cmp : -cmp
      })

  const filtered = applyFilters(activeOrders)
  const filteredOldCompleted = oldCompleted
    .filter((o) => {
      if (!search) return true
      const q = search.toLowerCase()
      return o.title.toLowerCase().includes(q) || o.client?.name?.toLowerCase().includes(q)
    })
    .sort((a, b) => (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? ''))

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === k && <span className="text-blue-500">{sortAsc ? '↑' : '↓'}</span>}
      </span>
    </th>
  )

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 md:gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder={t.dashboard.searchPlaceholder}
          value={search}
          onChange={(e) => setParam('q', e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm flex-1 min-w-[180px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => setParam('status', e.target.value)}
          className="w-40 md:w-44 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer transition-colors"
        >
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setParam('priority', e.target.value)}
          className="w-40 md:w-44 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer transition-colors"
        >
          {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Main table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-fade-in transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <SortHeader k="order_number" label={t.dashboard.colNumber} />
                <SortHeader k="title"        label={t.dashboard.colTitle} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {t.dashboard.colClient}
                </th>
                <SortHeader k="status"       label={t.dashboard.colStatus} />
                <SortHeader k="priority"     label={t.dashboard.colPriority} />
                <SortHeader k="deadline"     label={t.dashboard.colDeadline} />
                <SortHeader k="total_amount" label={t.dashboard.colAmount} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filtered.map((order) => {
                const overdue = isOverdue(order.deadline)
                return (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">
                      #{order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {order.title}
                        </span>
                        {order.is_urgent && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-800">
                            {t.common.urgent}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{order.client?.name ?? '—'}</td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => { e.stopPropagation(); setEditingStatusId(order.id) }}
                    >
                      {editingStatusId === order.id ? (
                        <select
                          autoFocus
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          onBlur={() => setEditingStatusId(null)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          {Object.entries(STATUS_LABELS)
                            .filter(([k]) => k !== 'cancelled')
                            .map(([v]) => (
                              <option key={v} value={v}>{(t.status as any)[v] ?? v}</option>
                            ))}
                        </select>
                      ) : (
                        <div className="cursor-pointer hover:opacity-80 transition-opacity" title={t.common.edit}>
                          {updatingId === order.id
                            ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            : <StatusBadge status={order.status} />
                          }
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={order.priority} /></td>
                    <td className={`px-4 py-3 text-sm ${overdue ? 'text-red-500 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                      {formatDate(order.deadline)}
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium tabular-nums">
                      {formatCurrency(order.total_amount)}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm">{t.dashboard.noOrders}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Older completed toggle */}
      {oldCompleted.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowOldCompleted((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer shadow-sm"
          >
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showOldCompleted ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.dashboard.completedBefore}
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredOldCompleted.length}
            </span>
          </button>

          {showOldCompleted && (
            <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-fade-in transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.dashboard.colTitle}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.dashboard.colClient}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.common.date}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{t.dashboard.colAmount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredOldCompleted.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors opacity-70 hover:opacity-100 group"
                      >
                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">#{order.order_number}</td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {order.title}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{order.client?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs">
                          {order.updated_at ? new Date(order.updated_at).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium tabular-nums">
                          {formatCurrency(order.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

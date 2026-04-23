import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useFinance } from '../hooks/useFinance'
import { StatusBadge } from '../components/StatusBadge'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { CardsSkeleton, TableSkeleton } from '../components/Skeleton'
import { formatCurrency, formatDate } from '../utils/format'
import { useT } from '../i18n'

type Tab = 'orders' | 'upcoming'

const PAYMENT_STATUS_COLORS = {
  paid: 'green',
  partial: 'yellow',
  unpaid: 'red',
} as const

export function FinancePage() {
  const t = useT()
  const { orders, upcoming, loading } = useFinance()
  const [tab, setTab] = useState<Tab>('orders')

  const PAYMENT_STATUS_LABELS = {
    paid:    t.finance.paid,
    partial: t.finance.partial,
    unpaid:  t.finance.unpaid,
  }

  const exportExcel = () => {
    if (tab === 'orders') {
      const rows = orders.map((o) => ({
        '№':            o.order_number,
        'Клиент':       o.client.name,
        'Название':     o.title,
        'Статус':       o.status,
        'Сумма':        o.total_amount,
        'Оплачено':     o.totalPaid,
        'Остаток':      o.remaining,
        'Статус оплаты':PAYMENT_STATUS_LABELS[o.paymentStatus],
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t.finance.orderPayments)
      XLSX.writeFile(wb, 'finance-orders.xlsx')
    } else {
      const rows = upcoming.map((p) => ({
        'Заказ №':       p.order.order_number,
        'Клиент':        p.order.client.name,
        'Сумма платежа': p.amount,
        'Срок':          p.due_date ? formatDate(p.due_date) : '—',
        'Дней до срока': p.daysUntil,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t.finance.upcomingPayments)
      XLSX.writeFile(wb, 'finance-upcoming.xlsx')
    }
  }

  const totalAmount    = orders.reduce((s, o) => s + o.total_amount, 0)
  const totalPaid      = orders.reduce((s, o) => s + o.totalPaid, 0)
  const totalRemaining = orders.reduce((s, o) => s + o.remaining, 0)
  const paidCount      = orders.filter((o) => o.paymentStatus === 'paid').length

  if (loading) {
    return (
      <div className="flex flex-col min-h-full page-enter">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.finance.title}</h1>
        </div>
        <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6">
          <CardsSkeleton count={4} />
          <TableSkeleton rows={6} cols={8} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      {/* Topbar */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 transition-colors duration-200">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.finance.title}</h1>
        <Button variant="secondary" size="sm" onClick={exportExcel}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">{t.finance.exportExcel}</span>
          <span className="sm:hidden">Excel</span>
        </Button>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 shadow-sm animate-fade-in-up delay-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.finance.totalOrders}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{orders.length}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{paidCount} {t.finance.paidFull}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 shadow-sm animate-fade-in-up delay-50">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.finance.totalAmount}</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 shadow-sm animate-fade-in-up delay-100">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.finance.totalPaid}</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 shadow-sm animate-fade-in-up delay-150">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.finance.totalRemaining}</p>
            <p className="text-xl md:text-2xl font-bold text-red-500 dark:text-red-400">{formatCurrency(totalRemaining)}</p>
            {upcoming.length > 0 && (
              <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">{upcoming.length} {t.finance.paymentsThisWeek}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-fade-in-up delay-200">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTab('orders')}
              className={`px-4 md:px-5 py-3 text-sm font-medium transition-colors cursor-pointer ${
                tab === 'orders'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-px'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t.finance.orderPayments}
            </button>
            <button
              onClick={() => setTab('upcoming')}
              className={`px-4 md:px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer ${
                tab === 'upcoming'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-px'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t.finance.upcomingPayments}
              {upcoming.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-xs rounded-full font-semibold">
                  {upcoming.length}
                </span>
              )}
            </button>
          </div>

          {tab === 'orders' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">№</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.clients.colClient}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colOrder}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colStatus}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colAmount}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colPaid}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colRemaining}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colPayment}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 dark:text-slate-600">{t.common.noData}</td>
                    </tr>
                  )}
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">#{o.order_number}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">
                        <Link to={`/clients/${o.client.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">{o.client.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100 max-w-48 truncate">
                        <Link to={`/orders/${o.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">{o.title}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(o.total_amount)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(o.totalPaid)}</td>
                      <td className="px-4 py-3 text-right text-red-500 dark:text-red-400 font-medium">{formatCurrency(o.remaining)}</td>
                      <td className="px-4 py-3">
                        <Badge color={PAYMENT_STATUS_COLORS[o.paymentStatus]}>
                          {PAYMENT_STATUS_LABELS[o.paymentStatus]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {orders.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-600">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t.finance.total} ({orders.length} {t.finance.ordersCount})
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-500 dark:text-red-400">{formatCurrency(totalRemaining)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {upcoming.length === 0 ? (
                <p className="px-4 py-12 text-center text-slate-400 dark:text-slate-600">{t.finance.noUpcoming}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colOrder}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.clients.colClient}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colAmount}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colDueDate}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.finance.colDaysLeft}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {upcoming.map((p) => {
                      const isOverduePayment = p.daysUntil < 0
                      const isToday = p.daysUntil === 0
                      const isSoon  = p.daysUntil <= 2 && p.daysUntil >= 0
                      return (
                        <tr key={p.id} className={`transition-colors ${
                          isOverduePayment ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100/60 dark:hover:bg-red-900/20'
                          : isSoon ? 'bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100/60 dark:hover:bg-orange-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}>
                          <td className="px-4 py-3">
                            <Link to={`/orders/${p.order.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                              #{p.order.order_number} — {p.order.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                            <Link to={`/clients/${p.order.client.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                              {p.order.client.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {p.due_date ? formatDate(p.due_date) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {isOverduePayment ? (
                              <span className="text-red-600 dark:text-red-400 font-semibold">{t.finance.overdue} ({Math.abs(p.daysUntil)} {t.finance.days})</span>
                            ) : isToday ? (
                              <span className="text-orange-600 dark:text-orange-400 font-semibold">{t.finance.today}</span>
                            ) : (
                              <span className={isSoon ? 'text-orange-500 dark:text-orange-400 font-medium' : 'text-slate-600 dark:text-slate-400'}>
                                {p.daysUntil} {t.finance.days}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

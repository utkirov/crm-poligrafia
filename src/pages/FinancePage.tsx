import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinance } from '../hooks/useFinance'
import { StatusBadge } from '../components/StatusBadge'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { CardsSkeleton, TableSkeleton } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
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
  const [exporting, setExporting] = useState(false)

  const paymentStatusLabels = {
    paid: t.finance.paid,
    partial: t.finance.partial,
    unpaid: t.finance.unpaid,
  }

  const exportExcel = async () => {
    setExporting(true)

    try {
      const XLSX = await import('xlsx')

      if (tab === 'orders') {
        const rows = orders.map((order) => ({
          [t.finance.excelColNumber]: order.order_number,
          [t.finance.excelColClient]: order.client.name,
          [t.finance.excelColTitle]: order.title,
          [t.finance.excelColStatus]: t.status[order.status],
          [t.finance.excelColAmount]: order.total_amount,
          [t.finance.excelColPaid]: order.totalPaid,
          [t.finance.excelColRemaining]: order.remaining,
          [t.finance.excelColPayStatus]: paymentStatusLabels[order.paymentStatus],
        }))

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, t.finance.orderPayments)
        XLSX.writeFile(workbook, 'finance-orders.xlsx')
      } else {
        const rows = upcoming.map((payment) => ({
          [t.finance.excelColOrderNum]: payment.order.order_number,
          [t.finance.excelColClient]: payment.order.client.name,
          [t.finance.excelColPayAmount]: payment.amount,
          [t.finance.excelColDueDate]: payment.due_date ? formatDate(payment.due_date) : '-',
          [t.finance.excelColDaysLeft]: payment.daysUntil,
        }))

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, t.finance.upcomingPayments)
        XLSX.writeFile(workbook, 'finance-upcoming.xlsx')
      }
    } finally {
      setExporting(false)
    }
  }

  const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)
  const totalPaid = orders.reduce((sum, order) => sum + order.totalPaid, 0)
  const totalRemaining = orders.reduce((sum, order) => sum + order.remaining, 0)
  const paidCount = orders.filter((order) => order.paymentStatus === 'paid').length

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
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 transition-colors duration-200">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.finance.title}</h1>
        <Button variant="secondary" size="sm" onClick={exportExcel} loading={exporting}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">{t.finance.exportExcel}</span>
          <span className="sm:hidden">Excel</span>
        </Button>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6">
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
            {upcoming.length > 0 ? (
              <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">{upcoming.length} {t.finance.paymentsThisWeek}</p>
            ) : null}
          </div>
        </div>

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
              {upcoming.length > 0 ? (
                <span className="ml-2 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-xs rounded-full font-semibold">
                  {upcoming.length}
                </span>
              ) : null}
            </button>
          </div>

          {tab === 'orders' ? (
            orders.length === 0 ? (
              <EmptyState
                title={t.common.noData}
                description={t.finance.orderPayments}
                icon={
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">#</th>
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
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">#{order.order_number}</td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">
                          <Link to={`/clients/${order.client.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">{order.client.name}</Link>
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 max-w-48 truncate">
                          <Link to={`/orders/${order.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">{order.title}</Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(order.total_amount)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(order.totalPaid)}</td>
                        <td className="px-4 py-3 text-right text-red-500 dark:text-red-400 font-medium">{formatCurrency(order.remaining)}</td>
                        <td className="px-4 py-3">
                          <Badge color={PAYMENT_STATUS_COLORS[order.paymentStatus]}>
                            {paymentStatusLabels[order.paymentStatus]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
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
                </table>
              </div>
            )
          ) : upcoming.length === 0 ? (
            <EmptyState
              title={t.finance.noUpcoming}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          ) : (
            <div className="overflow-x-auto">
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
                  {upcoming.map((payment) => {
                    const isOverduePayment = payment.daysUntil < 0
                    const isToday = payment.daysUntil === 0
                    const isSoon = payment.daysUntil <= 2 && payment.daysUntil >= 0

                    return (
                      <tr
                        key={payment.id}
                        className={`transition-colors ${
                          isOverduePayment
                            ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100/60 dark:hover:bg-red-900/20'
                            : isSoon
                              ? 'bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100/60 dark:hover:bg-orange-900/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Link to={`/orders/${payment.order.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                            #{payment.order.order_number} — {payment.order.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                          <Link to={`/clients/${payment.order.client.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                            {payment.order.client.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{payment.due_date ? formatDate(payment.due_date) : '-'}</td>
                        <td className="px-4 py-3">
                          {isOverduePayment ? (
                            <span className="text-red-600 dark:text-red-400 font-semibold">{t.finance.overdue} ({Math.abs(payment.daysUntil)} {t.finance.days})</span>
                          ) : isToday ? (
                            <span className="text-orange-600 dark:text-orange-400 font-semibold">{t.finance.today}</span>
                          ) : (
                            <span className={isSoon ? 'text-orange-500 dark:text-orange-400 font-medium' : 'text-slate-600 dark:text-slate-400'}>
                              {payment.daysUntil} {t.finance.days}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

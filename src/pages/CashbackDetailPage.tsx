import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { localDb } from '../lib/localDb'
import { useClient } from '../hooks/useClient'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { formatCurrency, formatDate } from '../utils/format'
import type { CashbackTransaction, Order, Client } from '../types'
import { useT } from '../i18n'

interface TxWithOrder extends CashbackTransaction {
  order: (Order & { client?: Pick<Client, 'id' | 'name'> }) | null
}

export function CashbackDetailPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { client, loading, error } = useClient(id)
  const [txWithOrders, setTxWithOrders] = useState<TxWithOrder[]>([])
  const [txLoading, setTxLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setTxLoading(true)
      const { data } = await localDb
        .from('cashback_transactions')
        .select('*, order:orders(*, client:clients(id, name))')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
      setTxWithOrders((data ?? []) as unknown as TxWithOrder[])
      setTxLoading(false)
    }
    load()
  }, [id])

  if (loading || txLoading) return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-blue-600" /></div>
  if (error || !client) return <div className="p-8 text-center text-red-500">{error ?? t.cashbackDetail.notFound}</div>

  const ownTx    = txWithOrders.filter((tx) => tx.type === 'earned_own')
  const referralTx = txWithOrders.filter((tx) => tx.type === 'earned_referral')
  const spentTx  = txWithOrders.filter((tx) => tx.type === 'spent')

  const totalEarned  = [...ownTx, ...referralTx].reduce((s, tx) => s + tx.amount, 0)
  const totalSpent   = spentTx.reduce((s, tx) => s + tx.amount, 0)
  const fromOwn      = ownTx.reduce((s, tx) => s + tx.amount, 0)
  const fromReferral = referralTx.reduce((s, tx) => s + tx.amount, 0)

  const metrics = [
    { label: t.cashbackDetail.totalEarned,   value: totalEarned,  color: 'text-green-600' },
    { label: t.cashbackDetail.totalSpent,    value: totalSpent,   color: 'text-red-500' },
    { label: t.cashbackDetail.fromOwn,       value: fromOwn,      color: 'text-blue-600' },
    { label: t.cashbackDetail.fromReferrals, value: fromReferral, color: 'text-teal-600' },
  ]

  const ownCols      = [t.cashbackDetail.colOrder, t.cashbackDetail.colTitle, t.cashbackDetail.colDate, t.cashbackDetail.colOrderAmount, t.cashbackDetail.colPercent, t.cashbackDetail.colEarned, t.cashbackDetail.colStatus]
  const referralCols = [t.cashbackDetail.colReferral, t.cashbackDetail.colOrder, t.cashbackDetail.colOrderTitle, t.cashbackDetail.colDate, t.cashbackDetail.colOrderAmount, t.cashbackDetail.colEarned]
  const spentCols    = [t.cashbackDetail.colOrder, t.cashbackDetail.colTitle, t.cashbackDetail.colDate, t.cashbackDetail.colDeducted, t.cashbackDetail.colStatus]

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs items={[
          { label: t.nav.clients, to: '/clients' },
          { label: client.name, to: `/clients/${id}` },
          { label: t.cashbackDetail.breadcrumb },
        ]} />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{t.cashbackDetail.title}</h1>
      </div>

      <div className="p-4 md:p-6 max-w-5xl flex flex-col gap-6">
        {/* 4 metrics */}
        <div className="grid grid-cols-4 gap-4">
          {metrics.map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{formatCurrency(value)}</p>
            </div>
          ))}
        </div>

        {/* Table 1 вЂ” Own orders */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.cashbackDetail.ownCashbackTitle}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {ownCols.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {ownTx.map((tx) => (
                <tr key={tx.id} onClick={() => tx.order && navigate(`/orders/${tx.order.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">#{tx.order?.order_number ?? 'вЂ”'}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{tx.order?.title ?? 'вЂ”'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(tx.created_at)}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{tx.order ? formatCurrency(tx.order.total_amount) : 'вЂ”'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{client.cashback_percent}%</td>
                  <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(tx.amount)}</td>
                  <td className="px-4 py-3">
                    {tx.order?.status === 'completed' ? <Badge color="green">{t.cashbackDetail.earnedBadge}</Badge>
                      : tx.order?.status === 'cancelled' ? <Badge color="gray">{t.cashbackDetail.cancelledBadge}</Badge>
                      : <Badge color="gray">{t.cashbackDetail.pendingBadge}</Badge>}
                  </td>
                </tr>
              ))}
              {ownTx.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">{t.cashbackDetail.noRecords}</td></tr>
              )}
            </tbody>
            {ownTx.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t.cashbackDetail.totalEarnedLabel}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{formatCurrency(fromOwn)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Table 2 вЂ” Referral cashback */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.cashbackDetail.referralCashbackTitle}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {referralCols.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {referralTx.map((tx) => (
                <tr key={tx.id} onClick={() => tx.order && navigate(`/orders/${tx.order.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{tx.order?.client?.name ?? 'вЂ”'}</td>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">#{tx.order?.order_number ?? 'вЂ”'}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{tx.order?.title ?? 'вЂ”'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(tx.created_at)}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{tx.order ? formatCurrency(tx.order.total_amount) : 'вЂ”'}</td>
                  <td className="px-4 py-3 font-medium text-teal-600">{formatCurrency(tx.amount)}</td>
                </tr>
              ))}
              {referralTx.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">{t.cashbackDetail.noRecords}</td></tr>
              )}
            </tbody>
            {referralTx.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t.cashbackDetail.totalReferralLabel}</td>
                  <td className="px-4 py-3 font-bold text-teal-600">{formatCurrency(fromReferral)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Table 3 вЂ” Spent */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.cashbackDetail.deductionsTitle}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {spentCols.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {spentTx.map((tx) => (
                <tr key={tx.id} onClick={() => tx.order && navigate(`/orders/${tx.order.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">#{tx.order?.order_number ?? 'вЂ”'}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{tx.order?.title ?? 'вЂ”'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(tx.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-red-500">в€’{formatCurrency(tx.amount)}</td>
                  <td className="px-4 py-3"><Badge color="red">{t.cashbackDetail.appliedBadge}</Badge></td>
                </tr>
              ))}
              {spentTx.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">{t.cashbackDetail.noRecords}</td></tr>
              )}
            </tbody>
            {spentTx.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t.cashbackDetail.totalDeductedLabel}</td>
                  <td className="px-4 py-3 font-bold text-red-500">в€’{formatCurrency(totalSpent)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useClient } from '../hooks/useClient'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { StatusBadge } from '../components/StatusBadge'
import { ClientFormModal } from '../components/ClientFormModal'
import { Spinner } from '../components/Spinner'
import { formatCurrency, formatDate } from '../utils/format'
import { useT } from '../i18n'

export function ClientDetailPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { client, loading, error, refetch } = useClient(id)
  const [editOpen, setEditOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-blue-600" /></div>
  if (error || !client) return <div className="p-8 text-center text-red-500">{error ?? t.clientDetail.notFound}</div>

  const referralCode = client.id.substring(0, 8).toUpperCase()
  const totalOrdersSum = client.orders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const referralEarned = client.cashback_transactions
    .filter((tx) => tx.type === 'earned_referral')
    .reduce((s, tx) => s + tx.amount, 0)

  const typeColor = client.type === 'individual' ? 'blue' : client.type === 'company' ? 'purple' : 'teal'

  const handleArchive = async () => {
    await db.from('clients').update({ is_archived: true }).eq('id', client.id)
    navigate('/clients')
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      {/* Topbar */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs items={[{ label: t.nav.clients, to: '/clients' }, { label: client.name }]} />
        <div className="flex items-center justify-between mt-2 gap-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{client.name}</h1>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>{t.clientDetail.editBtn}</Button>
            {!client.is_archived && (
              <Button variant="danger" size="sm" onClick={handleArchive}>{t.clientDetail.archiveBtn}</Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex gap-6">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* Profile card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-4 mb-5">
              <Avatar name={client.name} type={client.type} size="lg" />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{client.name}</h2>
                  <Badge color={typeColor}>{t.clientType[client.type]}</Badge>
                  {client.is_archived && <Badge color="gray">{t.clientDetail.archiveBadge}</Badge>}
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  {t.clientDetail.referralCode}: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{referralCode}</span>
                </p>
              </div>
            </div>

            {/* 3 metrics */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{client.orders.length}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t.clientDetail.ordersCount}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalOrdersSum)}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t.clientDetail.totalAmount}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-600">{formatCurrency(client.cashback_balance)}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t.clientDetail.cashback}</p>
              </div>
            </div>

            {/* Contacts */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {client.phone && <div><span className="text-slate-400 dark:text-slate-500">{t.clientDetail.phoneLabel}:</span> <span className="text-slate-900 dark:text-slate-100">{client.phone}</span></div>}
              {client.telegram && <div><span className="text-slate-400 dark:text-slate-500">{t.clientDetail.telegramLabel}:</span> <span className="text-slate-900 dark:text-slate-100">{client.telegram}</span></div>}
              {client.birthday && <div><span className="text-slate-400 dark:text-slate-500">{t.clientDetail.birthdayLabel}:</span> <span className="text-slate-900 dark:text-slate-100">{formatDate(client.birthday)}</span></div>}
              {client.source && <div><span className="text-slate-400 dark:text-slate-500">{t.clientDetail.sourceLabel}:</span> <span className="text-slate-900 dark:text-slate-100">{client.source}</span></div>}
              <div><span className="text-slate-400 dark:text-slate-500">{t.clientDetail.cashbackPctLabel}:</span> <span className="text-slate-900 dark:text-slate-100">{client.cashback_percent}%</span></div>
              <div><span className="text-slate-400 dark:text-slate-500">{t.clientDetail.registrationLabel}:</span> <span className="text-slate-900 dark:text-slate-100">{formatDate(client.created_at)}</span></div>
            </div>

            {/* Who brought */}
            {client.referrer && (
              <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{t.clientDetail.whoReferred}</p>
                <Link to={`/clients/${client.referrer.id}`} className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg p-2 -mx-2 transition-colors">
                  <div className="w-9 h-9 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                    {client.referrer.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{client.referrer.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t.clientDetail.earnedCashback}: <span className="text-green-600 font-medium">{formatCurrency(referralEarned)}</span>
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Orders history */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.clientDetail.ordersHistory}</h3>
            </div>
            {client.orders.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">{t.clientDetail.noOrders}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    {[t.clientDetail.colNumber, t.clientDetail.colTitle, t.clientDetail.colDate, t.clientDetail.colAmount, t.clientDetail.colStatus].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {client.orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">#{order.order_number}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{order.title}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(order.total_amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          {/* Cashback block */}
          <Link
            to={`/clients/${id}/cashback`}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow block"
          >
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.clientDetail.cashbackTitle}</h3>
            <p className="text-3xl font-bold text-green-600 mb-3">{formatCurrency(client.cashback_balance)}</p>
            <div className="flex flex-col gap-1.5">
              {client.cashback_transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {tx.type === 'earned_own' ? t.clientDetail.txEarnedOwn :
                     tx.type === 'earned_referral' ? t.clientDetail.txEarnedReferral : t.clientDetail.txSpent}
                  </span>
                  <span className={tx.type === 'spent' ? 'text-red-500' : 'text-green-600'}>
                    {tx.type === 'spent' ? '−' : '+'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
              {client.cashback_transactions.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.clientDetail.noTransactions}</p>
              )}
            </div>
            <p className="text-xs text-blue-600 mt-3 font-medium">{t.clientDetail.viewDetails}</p>
          </Link>

          {/* Referral activity */}
          {client.referrals.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.clientDetail.referralClients}</h3>
              <div className="flex flex-col gap-2 mb-3">
                {client.referrals.slice(0, 5).map((ref) => (
                  <Link key={ref.id} to={`/clients/${ref.id}`} className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded p-1 -mx-1 transition-colors">
                    <Avatar name={ref.name} type={ref.type} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{ref.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(ref.created_at)}</p>
                    </div>
                  </Link>
                ))}
                {client.referrals.length > 5 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">+{client.referrals.length - 5} {t.clientDetail.more}</p>
                )}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.clientDetail.totalEarned}:</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(referralEarned)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ClientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={refetch}
        initial={client}
      />
    </div>
  )
}

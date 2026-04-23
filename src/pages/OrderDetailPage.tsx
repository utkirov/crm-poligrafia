import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useOrder } from '../hooks/useOrder'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { toastSuccess } from '../lib/toast'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { ProgressBar } from '../components/ProgressBar'
import { Spinner } from '../components/Spinner'
import { formatCurrency, formatDate, formatDateTime, isOverdue, getInitials } from '../utils/format'
import {
  STATUS_LABELS, NEXT_STATUS, NEXT_STATUS_LABEL, STATUS_STEP,
} from '../utils/orderUtils'
import { generateOrderPdf } from '../utils/pdf'
import type { OrderStatus } from '../types'
import { useT } from '../i18n'

const KANBAN_STEPS: OrderStatus[] = ['new', 'in_progress', 'ready', 'completed']

const TIMELINE_COLORS: Record<string, string> = {
  created:        'bg-blue-500',
  status_changed: 'bg-green-500',
  comment:        'bg-gray-400',
  payment:        'bg-yellow-500',
  cancelled:      'bg-red-500',
}

export function OrderDetailPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { order, loading, error, refetch } = useOrder(id)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReasonText, setCancelReasonText] = useState('')
  const [cancelComment, setCancelComment] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [cancelReasons, setCancelReasons] = useState<{ id: string; reason: string }[]>([])

  useEffect(() => {
    supabase.from('cancel_reasons').select('id, reason').eq('is_active', true).order('reason').then(({ data }) => {
      setCancelReasons((data ?? []) as { id: string; reason: string }[])
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center text-red-500">
        {error ?? t.orderDetail.notFound}
      </div>
    )
  }

  const payments    = order.payments ?? []
  const totalPaid   = payments.filter((p) => p.is_paid).reduce((s, p) => s + p.amount, 0)
  const remaining   = order.total_amount - totalPaid
  const currentStep = STATUS_STEP[order.status]
  const overdue     = isOverdue(order.deadline)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const handleNextStatus = async () => {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setTransitioning(true)
    await db.from('orders').update({ status: next, updated_at: new Date().toISOString() }).eq('id', order.id)
    await db.from('order_timeline').insert({
      order_id: order.id,
      user_id: user!.id,
      event_type: 'status_changed',
      description: `${STATUS_LABELS[order.status]} → ${STATUS_LABELS[next]}`,
    })

    if (next === 'completed') {
      const cashback = Math.round(order.total_amount * order.client.cashback_percent / 100)
      if (cashback > 0) {
        await db.from('clients').update({
          cashback_balance: order.client.cashback_balance + cashback,
        }).eq('id', order.client.id)
        await db.from('cashback_transactions').insert({
          client_id: order.client.id,
          order_id: order.id,
          type: 'earned_own',
          amount: cashback,
        })
      }
      if (order.client.referrer && order.referrer_cashback > 0) {
        const refBalance = (order.client.referrer as { cashback_balance?: number }).cashback_balance ?? 0
        await db.from('clients').update({
          cashback_balance: refBalance + order.referrer_cashback,
        }).eq('id', order.client.referrer.id)
        await db.from('cashback_transactions').insert({
          client_id: order.client.referrer.id,
          order_id: order.id,
          type: 'earned_referral',
          amount: order.referrer_cashback,
        })
      }
    }

    setTransitioning(false)
    toastSuccess(t.orderDetail.statusUpdated)
    refetch()
  }

  const handleCancel = async () => {
    if (!cancelReasonText.trim()) return
    setTransitioning(true)
    await db.from('orders').update({
      status: 'cancelled',
      cancel_reason: cancelReasonText,
      cancel_comment: cancelComment,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)
    await db.from('order_timeline').insert({
      order_id: order.id,
      user_id: user!.id,
      event_type: 'cancelled',
      description: cancelReasonText + (cancelComment ? `. ${cancelComment}` : ''),
    })
    if (user?.role === 'director') {
      const { data: profiles } = await supabase.from('profiles').select('id').eq('role', 'director')
      if (profiles) {
        const rows = profiles as { id: string }[]
        for (const p of rows) {
          await db.from('notifications').insert({
            user_id: p.id,
            type: 'order_cancelled',
            order_id: order.id,
            message: `#${order.order_number} «${order.title}»`,
          })
        }
      }
    }
    setCancelOpen(false)
    setTransitioning(false)
    toastSuccess(t.orderDetail.orderCancelled)
    refetch()
  }

  const handleRepeat = () => navigate('/orders/create', { state: { repeatFrom: order } })

  return (
    <div className="flex flex-col min-h-full page-enter">
      {/* Topbar */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs
          items={[
            { label: t.nav.orders, to: '/dashboard' },
            { label: `#${order.order_number} — ${order.title}` },
          ]}
        />
        <div className="flex items-center justify-between mt-2 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{order.title}</h1>
            {order.is_urgent && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                {t.orderDetail.urgentBadge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleRepeat}>{t.orderDetail.repeatBtn}</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/orders/${id}/edit`)}>{t.orderDetail.editBtn}</Button>
            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>{t.orderDetail.cancelBtn}</Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex gap-6">
        {/* Main column */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Status progress */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t.orderDetail.orderStatus}</h2>
            {order.status === 'cancelled' ? (
              <div className="flex items-center gap-3">
                <Badge color="red">{t.orderDetail.cancelledBadge}</Badge>
                {order.cancel_reason && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.orderDetail.cancelReason}: {order.cancel_reason}</span>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-0 mb-4">
                  {KANBAN_STEPS.map((step, i) => {
                    const stepIndex = STATUS_STEP[step]
                    const done   = currentStep > stepIndex
                    const active = currentStep === stepIndex
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-colors ${
                          done ? 'bg-green-500 border-green-500 text-white'
                            : active ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                        }`}>
                          {done ? '✓' : stepIndex + 1}
                        </div>
                        <div className="flex flex-col ml-2 mr-4 flex-1">
                          <span className={`text-xs font-medium ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-slate-400 dark:text-slate-500'}`}>
                            {STATUS_LABELS[step]}
                          </span>
                          {i < KANBAN_STEPS.length - 1 && (
                            <div className={`h-0.5 mt-3 ${done ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {NEXT_STATUS[order.status] && (
                  <Button onClick={handleNextStatus} loading={transitioning}>
                    {NEXT_STATUS_LABEL[order.status]}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Order details */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t.orderDetail.orderDetails}</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.clientLabel}:</span>{' '}
                <Link to={`/clients/${order.client?.id}`} className="text-blue-600 hover:underline font-medium">
                  {order.client?.name ?? '—'}
                </Link>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.managerLabel}:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100">{order.manager?.name ?? '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.deadlineLabel}:</span>{' '}
                <span className={overdue ? 'text-red-500 font-medium' : 'text-slate-900 dark:text-slate-100'}>
                  {formatDate(order.deadline)}
                  {overdue && ` ${t.orderDetail.overdueText}`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.priorityLabel}:</span>{' '}
                <PriorityBadge priority={order.priority} />
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.createdLabel}:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100">{formatDate(order.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.statusLabel}:</span>{' '}
                <StatusBadge status={order.status} />
              </div>
            </div>

            {order.description && (
              <div className="text-sm mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 mb-1">{t.orderDetail.descriptionLabel}:</p>
                <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{order.description}</p>
              </div>
            )}

            {order.order_items?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t.orderDetail.servicesLabel}:</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left pb-2">{t.orderDetail.colService}</th>
                      <th className="text-right pb-2">{t.orderDetail.colQty}</th>
                      <th className="text-right pb-2">{t.orderDetail.colPrice}</th>
                      <th className="text-right pb-2">{t.common.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {order.order_items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-slate-900 dark:text-slate-100">{item.service?.name ?? '—'}</td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.quantity ?? '—'}</td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {item.price_per_unit ? formatCurrency(item.price_per_unit) : '—'}
                        </td>
                        <td className="py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={3} className="pt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t.common.total}</td>
                      <td className="pt-2 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(order.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t.orderDetail.historyTitle}</h2>
            {(order.order_timeline ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t.orderDetail.noEvents}</p>
            ) : (
              <div className="flex flex-col gap-0">
                {[...(order.order_timeline ?? [])].sort((a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ).map((entry, i) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${TIMELINE_COLORS[entry.event_type] ?? 'bg-slate-400'}`} />
                      {i < (order.order_timeline.length - 1) && (
                        <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 my-1" />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <p className="text-sm text-slate-900 dark:text-slate-100">{entry.description ?? entry.event_type}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {entry.user?.name ?? t.orderDetail.systemUser} · {formatDateTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PDF button */}
          <div className="flex">
            <Button variant="secondary" onClick={() => generateOrderPdf(order)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {t.orderDetail.generatePdf}
            </Button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          {/* Payment block */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.orderDetail.paymentTitle}</h3>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{formatCurrency(order.total_amount)}</p>
            <ProgressBar value={totalPaid} max={order.total_amount} showLabel className="mb-3" />
            <div className="flex justify-between text-sm mb-4">
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-xs">{t.orderDetail.paidLabel}</p>
                <p className="font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 dark:text-slate-500 text-xs">{t.orderDetail.remainingLabel}</p>
                <p className="font-semibold text-red-500">{formatCurrency(remaining)}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/orders/${id}/payments`)}
            >
              {t.orderDetail.managePayments}
            </Button>
          </div>

          {/* Client block */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.orderDetail.clientTitle}</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                {getInitials(order.client?.name ?? '?')}
              </div>
              <div>
                <Link to={`/clients/${order.client?.id}`} className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600">
                  {order.client?.name}
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              {order.client?.phone && (
                <div className="flex gap-2 text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500">{t.orderDetail.phoneSuffix}:</span>
                  <span>{order.client.phone}</span>
                </div>
              )}
              {order.client?.telegram && (
                <div className="flex gap-2 text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500">TG:</span>
                  <span>{order.client.telegram}</span>
                </div>
              )}
              <div className="flex gap-2 text-slate-600 dark:text-slate-400">
                <span className="text-slate-400 dark:text-slate-500">{t.orderDetail.cashbackLabel}:</span>
                <span className="text-green-600 font-medium">{formatCurrency(order.client?.cashback_balance ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Referral block */}
          {order.client?.referrer && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.orderDetail.referralTitle}</h3>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                  {getInitials(order.client.referrer.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{order.client.referrer.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.orderDetail.cashbackLabel}: <span className="text-green-600 font-medium">{formatCurrency(order.referrer_cashback)}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title={t.orderDetail.cancelOrderTitle} className="max-w-md">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{t.orderDetail.cancelReasonLabel}</label>
            {cancelReasons.length > 0 ? (
              <select
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">{t.orderDetail.selectReason}</option>
                {cancelReasons.map((r) => (
                  <option key={r.id} value={r.reason}>{r.reason}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                placeholder={t.orderDetail.cancelReasonPlaceholder}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{t.orderDetail.commentLabel}</label>
            <textarea
              value={cancelComment}
              onChange={(e) => setCancelComment(e.target.value)}
              rows={3}
              placeholder={t.orderDetail.commentPlaceholder}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>{t.common.close}</Button>
            <Button variant="danger" onClick={handleCancel} loading={transitioning} disabled={!cancelReasonText.trim()}>
              {t.orderDetail.cancelOrderBtn}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

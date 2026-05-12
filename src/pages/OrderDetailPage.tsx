import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useOrder } from '../hooks/useOrder'
import { localDb } from '../lib/localDb'
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
import { OrderTicketForm } from '../components/OrderTicketForm'
import { OrderTicketStatusBadge } from '../components/OrderTicketStatusBadge'
import { formatCurrency, formatDate, formatDateTime, getInitials, isOverdue } from '../utils/format'
import { NEXT_STATUS, STATUS_STEP } from '../utils/orderUtils'
import { generateOrderPdf } from '../utils/pdf'
import type { OrderStatus } from '../types'
import { useT } from '../i18n'
import { calculatePayableAmount, calculateRemainingAmount, calculateTotalPaid } from '../utils/paymentUtils'

const KANBAN_STEPS: OrderStatus[] = ['new', 'in_progress', 'ready', 'completed']

const TIMELINE_COLORS: Record<string, string> = {
  created: 'bg-blue-500',
  status_changed: 'bg-green-500',
  comment: 'bg-slate-400',
  payment: 'bg-yellow-500',
  cancelled: 'bg-red-500',
}

export function OrderDetailPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { order, loading, error, refetch } = useOrder(id)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [cancelReasonText, setCancelReasonText] = useState('')
  const [cancelComment, setCancelComment] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)
  const [cancelReasons, setCancelReasons] = useState<{ id: string; reason: string }[]>([])

  useEffect(() => {
    localDb
      .from('cancel_reasons')
      .select('id, reason')
      .eq('is_active', true)
      .order('reason')
      .then(({ data }) => {
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
    return <div className="p-8 text-center text-red-500">{error ?? t.orderDetail.notFound}</div>
  }

  const payments = order.payments ?? []
  const payableAmount = calculatePayableAmount(order.total_amount, order.cashback_applied)
  const totalPaid = calculateTotalPaid(payments)
  const remaining = calculateRemainingAmount(payableAmount, totalPaid)
  const currentStep = STATUS_STEP[order.status]
  const overdue = isOverdue(order.deadline)
  const canManageOrder = user?.role === 'director' || user?.role === 'manager'



  const handleNextStatus = async () => {
    const nextStatus = NEXT_STATUS[order.status]
    if (!nextStatus) {
      return
    }

    setTransitioning(true)

    await localDb.from('orders').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', order.id)
    await localDb.from('order_timeline').insert({
      order_id: order.id,
      user_id: user!.id,
      event_type: 'status_changed',
      description: `${t.status[order.status]} -> ${t.status[nextStatus]}`,
    })

    if (nextStatus === 'completed') {
      const cashback = Math.round(order.total_amount * order.client.cashback_percent / 100)

      if (cashback > 0) {
        const { data: existingOwnCashback } = await localDb
          .from('cashback_transactions')
          .select('id')
          .eq('order_id', order.id)
          .eq('type', 'earned_own')
          .limit(1)

        if (!((existingOwnCashback as unknown as unknown[] | null)?.length)) {
          await localDb.from('clients').update({
            cashback_balance: order.client.cashback_balance + cashback,
          }).eq('id', order.client.id)
          await localDb.from('cashback_transactions').insert({
            client_id: order.client.id,
            order_id: order.id,
            type: 'earned_own',
            amount: cashback,
          })
        }
      }

      if (order.client.referrer && order.referrer_cashback > 0) {
        const { data: existingReferralCashback } = await localDb
          .from('cashback_transactions')
          .select('id')
          .eq('order_id', order.id)
          .eq('type', 'earned_referral')
          .limit(1)

        if (!((existingReferralCashback as unknown as unknown[] | null)?.length)) {
          const referrerBalance = (order.client.referrer as { cashback_balance?: number }).cashback_balance ?? 0
          await localDb.from('clients').update({
            cashback_balance: referrerBalance + order.referrer_cashback,
          }).eq('id', order.client.referrer.id)
          await localDb.from('cashback_transactions').insert({
            client_id: order.client.referrer.id,
            order_id: order.id,
            type: 'earned_referral',
            amount: order.referrer_cashback,
          })
        }
      }
    }

    setTransitioning(false)
    toastSuccess(t.orderDetail.statusUpdated)
    refetch()
  }

  const handleCancel = async () => {
    if (!cancelReasonText.trim()) {
      return
    }

    setTransitioning(true)

    await localDb.from('orders').update({
      status: 'cancelled',
      cancel_reason: cancelReasonText,
      cancel_comment: cancelComment,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)

    await localDb.from('order_timeline').insert({
      order_id: order.id,
      user_id: user!.id,
      event_type: 'cancelled',
      description: cancelReasonText + (cancelComment ? `. ${cancelComment}` : ''),
    })

    if (user?.role === 'director') {
      const { data: profiles } = await localDb.from('profiles').select('id').eq('role', 'director')
      if (profiles) {
        const rows = profiles as { id: string }[]
        for (const profile of rows) {
          await localDb.from('notifications').insert({
            user_id: profile.id,
            type: 'order_cancelled',
            order_id: order.id,
            message: `#${order.order_number} "${order.title}"`,
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
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs
          items={[
            { label: t.nav.orders, to: '/dashboard' },
            { label: `#${order.order_number} - ${order.title}` },
          ]}
        />
        <div className="flex items-center justify-between mt-2 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{order.title}</h1>
            {order.is_urgent ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                {t.orderDetail.urgentBadge}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {canManageOrder ? (
              <>
                <Button variant="secondary" size="sm" onClick={handleRepeat}>
                  {t.orderDetail.repeatBtn}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/orders/${id}/edit`)}>
                  {t.orderDetail.editBtn}
                </Button>
                {order.status !== 'cancelled' && order.status !== 'completed' ? (
                  <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                    {t.orderDetail.cancelBtn}
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex gap-6">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t.orderDetail.orderStatus}</h2>
            {order.status === 'cancelled' ? (
              <div className="flex items-center gap-3">
                <Badge color="red">{t.orderDetail.cancelledBadge}</Badge>
                {order.cancel_reason ? (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t.orderDetail.cancelReason}: {order.cancel_reason}
                  </span>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-0 mb-4">
                  {KANBAN_STEPS.map((step, index) => {
                    const stepIndex = STATUS_STEP[step]
                    const done = currentStep > stepIndex
                    const active = currentStep === stepIndex

                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-colors ${
                            done
                              ? 'bg-green-500 border-green-500 text-white'
                              : active
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {done ? '✓' : stepIndex + 1}
                        </div>
                        <div className="flex flex-col ml-2 mr-4 flex-1">
                          <span
                            className={`text-xs font-medium ${
                              active
                                ? 'text-blue-600'
                                : done
                                  ? 'text-green-600'
                                  : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {t.status[step]}
                          </span>
                          {index < KANBAN_STEPS.length - 1 ? (
                            <div className={`h-0.5 mt-3 ${done ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {canManageOrder && NEXT_STATUS[order.status] ? (
                  <Button
                    onClick={order.status === 'ready' ? () => setConfirmCompleteOpen(true) : handleNextStatus}
                    loading={transitioning}
                  >
                    {order.status === 'new'
                      ? t.orderUtils.takeToWork
                      : order.status === 'in_progress'
                        ? t.orderUtils.markReady
                        : t.orderUtils.completeOrder}
                  </Button>
                ) : null}
              </>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t.orderDetail.orderDetails}</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.clientLabel}:</span>{' '}
                <Link to={`/clients/${order.client?.id}`} className="text-blue-600 hover:underline font-medium">
                  {order.client?.name ?? '-'}
                </Link>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.managerLabel}:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100">{order.manager?.name ?? '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.orderDetail.deadlineLabel}:</span>{' '}
                <span className={overdue ? 'text-red-500 font-medium' : 'text-slate-900 dark:text-slate-100'}>
                  {formatDate(order.deadline)}
                  {overdue ? ` ${t.orderDetail.overdueText}` : ''}
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

            {order.description ? (
              <div className="text-sm mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 mb-1">{t.orderDetail.descriptionLabel}:</p>
                <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{order.description}</p>
              </div>
            ) : null}

            {order.order_items?.length ? (
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
                        <td className="py-2 text-slate-900 dark:text-slate-100">{item.service?.name ?? '-'}</td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.quantity ?? '-'}</td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {item.price_per_unit ? formatCurrency(item.price_per_unit) : '-'}
                        </td>
                        <td className="py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={3} className="pt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t.common.total}
                      </td>
                      <td className="pt-2 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(order.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.orderDetail.ticketTitle}</h2>
              {order.order_ticket ? (
                <Link to={`/tickets/${order.order_ticket.id}`} className="text-sm text-blue-600 hover:underline">
                  {t.orderDetail.ticketOpen}
                </Link>
              ) : user?.role === 'director' || user?.role === 'manager' ? (
                <Button size="sm" onClick={() => setTicketOpen(true)}>
                  {t.orderDetail.ticketCreate}
                </Button>
              ) : null}
            </div>

            {order.order_ticket ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{order.order_ticket.title}</p>
                    {order.order_ticket.description ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{order.order_ticket.description}</p>
                    ) : null}
                  </div>
                  <OrderTicketStatusBadge status={order.order_ticket.status} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500">{t.orderDetail.ticketManager}</p>
                    <p className="text-slate-900 dark:text-slate-100">{order.order_ticket.manager_assignee.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500">{t.orderDetail.ticketDesigner}</p>
                    <p className="text-slate-900 dark:text-slate-100">{order.order_ticket.designer_assignee.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500">{t.orderDetail.ticketDeadline}</p>
                    <p className="text-slate-900 dark:text-slate-100">{order.order_ticket.deadline ? formatDate(order.order_ticket.deadline) : '—'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.orderDetail.ticketMissing}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t.orderDetail.ticketHint}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t.orderDetail.historyTitle}</h2>
            {(order.order_timeline ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t.orderDetail.noEvents}</p>
            ) : (
              <div className="flex flex-col gap-0">
                {[...(order.order_timeline ?? [])]
                  .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
                  .map((entry, index) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${TIMELINE_COLORS[entry.event_type] ?? 'bg-slate-400'}`} />
                        {index < order.order_timeline.length - 1 ? (
                          <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 my-1" />
                        ) : null}
                      </div>
                      <div className="pb-4 flex-1">
                        <p className="text-sm text-slate-900 dark:text-slate-100">{entry.description ?? entry.event_type}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {entry.user?.name ?? t.orderDetail.systemUser} | {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="flex">
            <Button variant="secondary" onClick={() => void generateOrderPdf(order)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              {t.orderDetail.generatePdf}
            </Button>
          </div>
        </div>

        <div className="w-72 shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.orderDetail.paymentTitle}</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{formatCurrency(payableAmount)}</p>
            <ProgressBar value={totalPaid} max={payableAmount || 1} showLabel className="mb-3" />
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
            {canManageOrder ? (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate(`/orders/${id}/payments`)}>
                {t.orderDetail.managePayments}
              </Button>
            ) : null}
          </div>

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
              {order.client?.phone ? (
                <div className="flex gap-2 text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500">{t.orderDetail.phoneSuffix}:</span>
                  <span>{order.client.phone}</span>
                </div>
              ) : null}
              {order.client?.telegram ? (
                <div className="flex gap-2 text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500">TG:</span>
                  <span>{order.client.telegram}</span>
                </div>
              ) : null}
              <div className="flex gap-2 text-slate-600 dark:text-slate-400">
                <span className="text-slate-400 dark:text-slate-500">{t.orderDetail.cashbackLabel}:</span>
                <span className="text-green-600 font-medium">{formatCurrency(order.client?.cashback_balance ?? 0)}</span>
              </div>
            </div>
          </div>

          {order.client?.referrer ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.orderDetail.referralTitle}</h3>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                  {getInitials(order.client.referrer.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{order.client.referrer.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.orderDetail.cashbackLabel}:{' '}
                    <span className="text-green-600 font-medium">{formatCurrency(order.referrer_cashback)}</span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title={t.orderDetail.ticketTitle}
        className="max-w-2xl"
      >
        <OrderTicketForm
          order={order}
          onCancel={() => setTicketOpen(false)}
          onSuccess={() => {
            setTicketOpen(false)
            refetch()
          }}
        />
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t.orderDetail.cancelOrderTitle}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              {t.orderDetail.cancelReasonLabel}
            </label>
            {cancelReasons.length > 0 ? (
              <select
                value={cancelReasonText}
                onChange={(event) => setCancelReasonText(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">{t.orderDetail.selectReason}</option>
                {cancelReasons.map((reason) => (
                  <option key={reason.id} value={reason.reason}>
                    {reason.reason}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={cancelReasonText}
                onChange={(event) => setCancelReasonText(event.target.value)}
                placeholder={t.orderDetail.cancelReasonPlaceholder}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              {t.orderDetail.commentLabel}
            </label>
            <textarea
              value={cancelComment}
              onChange={(event) => setCancelComment(event.target.value)}
              rows={3}
              placeholder={t.orderDetail.commentPlaceholder}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              {t.common.close}
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={transitioning}
              disabled={!cancelReasonText.trim()}
            >
              {t.orderDetail.cancelOrderBtn}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        title={t.orderDetail.confirmCompleteTitle}
        className="max-w-sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t.orderDetail.confirmCompleteText}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmCompleteOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="success"
              onClick={() => { setConfirmCompleteOpen(false); void handleNextStatus() }}
              loading={transitioning}
            >
              {t.orderDetail.confirmCompleteBtn}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

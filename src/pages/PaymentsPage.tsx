import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { localDb } from '../lib/localDb'
import { useOrder } from '../hooks/useOrder'
import { useAuthStore } from '../store/authStore'
import { toastError } from '../lib/toast'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { ProgressBar } from '../components/ProgressBar'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { Spinner } from '../components/Spinner'
import { PriceInput } from '../components/PriceInput'
import { formatCurrency, formatDate } from '../utils/format'
import { formatPriceInput, parsePriceInput } from '../utils/priceInput'
import type { PaymentType } from '../types'
import { useT } from '../i18n'
import {
  calculatePayableAmount,
  calculateRemainingAmount,
  calculateScheduledPaymentsTotal,
  calculateTotalPaid,
  willPaymentsExceedPayableAmount,
} from '../utils/paymentUtils'

export function PaymentsPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { order, loading, error, refetch } = useOrder(id)

  const paymentTypeOptions = [
    { value: 'cash', label: t.paymentType.cash },
    { value: 'transfer', label: t.paymentType.transfer },
    { value: 'bank_transfer', label: t.paymentType.bank_transfer },
  ]

  const [newAmount, setNewAmount] = useState(formatPriceInput(0))
  const [newDate, setNewDate] = useState('')
  const [newType, setNewType] = useState<PaymentType>('cash')
  const [saving, setSaving] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-blue-600" /></div>
  }

  if (error || !order) {
    return <div className="p-8 text-center text-red-500">{error ?? t.payments.notFound}</div>
  }

  const payments = order.payments ?? []
  const payableAmount = calculatePayableAmount(order.total_amount, order.cashback_applied)
  const totalPaid = calculateTotalPaid(payments)
  const remaining = calculateRemainingAmount(payableAmount, totalPaid)
  const cashbackPreview = Math.round(order.total_amount * order.client.cashback_percent / 100)

  const handleMark = async (paymentId: string) => {
    const payment = payments.find((item) => item.id === paymentId)
    if (!payment) {
      return
    }

    if (payment.amount > remaining) {
      toastError('Эта часть оплаты превышает остаток по заказу')
      return
    }

    setMarkingId(paymentId)
    const now = new Date().toISOString()

    await localDb.from('payments').update({ is_paid: true, paid_at: now }).eq('id', paymentId)
    await localDb.from('order_timeline').insert({
      order_id: order.id,
      user_id: user!.id,
      event_type: 'payment',
      description: t.payments.paymentMarked,
    })

    setMarkingId(null)
    refetch()
  }

  const handleAdd = async () => {
    const parsedAmount = parsePriceInput(newAmount)
    if (!parsedAmount || !newDate) {
      return
    }

    const scheduledTotal = calculateScheduledPaymentsTotal(payments) + parsedAmount
    if (willPaymentsExceedPayableAmount(payableAmount, scheduledTotal)) {
      toastError('Сумма частей оплаты превышает сумму к оплате по заказу')
      return
    }

    setSaving(true)
    await localDb.from('payments').insert({
      order_id: order.id,
      amount: parsedAmount,
      due_date: newDate,
      payment_type: newType,
      is_paid: false,
    })
    setNewAmount(formatPriceInput(0))
    setNewDate('')
    setNewType('cash')
    setSaving(false)
    refetch()
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs
          items={[
            { label: t.nav.orders, to: '/dashboard' },
            { label: `#${order.order_number} - ${order.title}`, to: `/orders/${id}` },
            { label: t.payments.manageTitle },
          ]}
        />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{t.payments.manageTitle}</h1>
      </div>

      <div className="p-4 md:p-6 max-w-4xl">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{t.payments.orderAmountLabel}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(payableAmount)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{t.payments.paidLabel}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{t.payments.remainingLabel}</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(remaining)}</p>
          </div>
        </div>

        <div className="mb-6">
          <ProgressBar value={totalPaid} max={payableAmount || 1} showLabel />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {[t.payments.colNumber, t.payments.colAmount, t.payments.colDate, t.payments.colPaymentType, t.payments.colStatus, t.payments.colAction].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {payments.map((payment, index) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(payment.due_date)}</td>
                  <td className="px-4 py-3">
                    <Badge color="blue">
                      {payment.payment_type ? t.paymentType[payment.payment_type as keyof typeof t.paymentType] : '-'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {payment.is_paid
                      ? <Badge color="green">{t.payments.statusPaid}</Badge>
                      : <Badge color="yellow">{t.payments.statusPending}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant={payment.is_paid ? 'ghost' : 'success'}
                      disabled={payment.is_paid}
                      loading={markingId === payment.id}
                      onClick={() => handleMark(payment.id)}
                    >
                      {payment.is_paid ? t.payments.statusPaid : t.payments.markBtn}
                    </Button>
                  </td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">{t.payments.noPayments}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{t.payments.addPartTitle}</p>
            <div className="flex gap-3 flex-wrap">
              <PriceInput
                value={newAmount}
                onChange={(value) => setNewAmount(value)}
                placeholder={t.payments.amountPlaceholder}
              />
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-40"
              />
              <Select
                options={paymentTypeOptions}
                value={newType}
                onChange={(e) => setNewType(e.target.value as PaymentType)}
                className="w-44"
              />
              <Button
                onClick={handleAdd}
                loading={saving}
                disabled={
                  !parsePriceInput(newAmount)
                  || !newDate
                  || willPaymentsExceedPayableAmount(
                    payableAmount,
                    calculateScheduledPaymentsTotal(payments) + parsePriceInput(newAmount),
                  )
                }
              >
                {t.payments.addPartBtn}
              </Button>
            </div>
          </div>
        </div>

        {cashbackPreview > 0 && remaining > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.payments.cashbackHint} <strong>{formatCurrency(cashbackPreview)}</strong> {t.payments.cashbackUnit}
          </div>
        )}

        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate(`/orders/${id}`)}>
            {t.payments.backToOrder}
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useOrder } from '../hooks/useOrder'
import { useAuthStore } from '../store/authStore'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { ProgressBar } from '../components/ProgressBar'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { Spinner } from '../components/Spinner'
import { formatCurrency, formatDate } from '../utils/format'
import { PAYMENT_TYPE_LABELS } from '../utils/orderUtils'
import type { PaymentType } from '../types'
import { useT } from '../i18n'

export function PaymentsPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { order, loading, error, refetch } = useOrder(id)

  const paymentTypeOptions = [
    { value: 'cash',          label: t.paymentType.cash },
    { value: 'transfer',      label: t.paymentType.transfer },
    { value: 'bank_transfer', label: t.paymentType.bank_transfer },
  ]

  const [newAmount, setNewAmount] = useState('')
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
  const totalPaid = payments.filter((p) => p.is_paid).reduce((s, p) => s + p.amount, 0)
  const remaining = order.total_amount - totalPaid
  const cashbackPreview = Math.round(order.total_amount * order.client.cashback_percent / 100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const handleMark = async (paymentId: string) => {
    setMarkingId(paymentId)
    const now = new Date().toISOString()
    await db.from('payments').update({ is_paid: true, paid_at: now }).eq('id', paymentId)
    await db.from('order_timeline').insert({
      order_id: order.id,
      user_id: user!.id,
      event_type: 'payment',
      description: t.payments.paymentMarked,
    })

    const refreshed = await supabase.from('payments').select('*').eq('order_id', order.id)
    const rows = (refreshed.data ?? []) as { is_paid: boolean }[]
    const allPaid = rows.every((p) => p.is_paid)
    if (allPaid && cashbackPreview > 0) {
      await db.from('clients').update({
        cashback_balance: order.client.cashback_balance + cashbackPreview,
      }).eq('id', order.client.id)
      await db.from('cashback_transactions').insert({
        client_id: order.client.id,
        order_id: order.id,
        type: 'earned_own',
        amount: cashbackPreview,
      })
    }

    setMarkingId(null)
    refetch()
  }

  const handleAdd = async () => {
    if (!newAmount || !newDate) return
    setSaving(true)
    await db.from('payments').insert({
      order_id: order.id,
      amount: parseFloat(newAmount),
      due_date: newDate,
      payment_type: newType,
      is_paid: false,
    })
    setNewAmount('')
    setNewDate('')
    setNewType('cash')
    setSaving(false)
    refetch()
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      {/* Topbar */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs
          items={[
            { label: t.nav.orders, to: '/dashboard' },
            { label: `#${order.order_number} — ${order.title}`, to: `/orders/${id}` },
            { label: t.payments.manageTitle },
          ]}
        />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{t.payments.manageTitle}</h1>
      </div>

      <div className="p-4 md:p-6 max-w-4xl">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{t.payments.orderAmountLabel}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(order.total_amount)}</p>
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
          <ProgressBar value={totalPaid} max={order.total_amount} showLabel />
        </div>

        {/* Payments table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {[t.payments.colNumber, t.payments.colAmount, t.payments.colDate, t.payments.colPaymentType, t.payments.colStatus, t.payments.colAction].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {payments.map((p, i) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(p.due_date)}</td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{p.payment_type ? PAYMENT_TYPE_LABELS[p.payment_type] : '—'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {p.is_paid
                      ? <Badge color="green">{t.payments.statusPaid}</Badge>
                      : <Badge color="yellow">{t.payments.statusPending}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant={p.is_paid ? 'ghost' : 'success'}
                      disabled={p.is_paid}
                      loading={markingId === p.id}
                      onClick={() => handleMark(p.id)}
                    >
                      {p.is_paid ? t.payments.statusPaid : t.payments.markBtn}
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

          {/* Add new payment row */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{t.payments.addPartTitle}</p>
            <div className="flex gap-3 flex-wrap">
              <Input
                placeholder={t.payments.amountPlaceholder}
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-36"
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
              <Button onClick={handleAdd} loading={saving} disabled={!newAmount || !newDate}>
                {t.payments.addPartBtn}
              </Button>
            </div>
          </div>
        </div>

        {/* Cashback hint */}
        {cashbackPreview > 0 && remaining > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.payments.cashbackHint}{' '}
            <strong>{formatCurrency(cashbackPreview)}</strong> {t.payments.cashbackUnit}
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

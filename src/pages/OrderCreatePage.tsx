import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/Button'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { StepClient } from './order-create/StepClient'
import { StepOrder } from './order-create/StepOrder'
import { StepPayment } from './order-create/StepPayment'
import { INITIAL_FORM_STATE, type OrderFormState } from './order-create/types'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { toastSuccess, toastError } from '../lib/toast'
import { useT } from '../i18n'

function isStep1Valid(form: OrderFormState) {
  if (form.selectedClient) return true
  return form.newClient.name.trim() !== ''
}

function isStep2Valid(form: OrderFormState) {
  return form.title.trim() !== ''
}

export function OrderCreatePage() {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<OrderFormState>(INITIAL_FORM_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isDirty, setIsDirty] = useState(false)

  useUnsavedChanges(isDirty && !submitting)

  const onChange = (patch: Partial<OrderFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setIsDirty(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const STEPS = [
    { label: t.orderCreate.stepClient, key: 'client' },
    { label: t.orderCreate.stepOrder,  key: 'order' },
    { label: t.orderCreate.stepPayment,key: 'payment' },
  ] as const

  const canGoNext = step === 0 ? isStep1Valid(form) : step === 1 ? isStep2Valid(form) : true

  const handleNext = () => { if (step < 2) setStep((s) => s + 1) }
  const handleBack = () => { if (step > 0) setStep((s) => s - 1) }

  const handleSubmit = async () => {
    setSubmitting(true)
    setErrors([])

    try {
      // 1. Create or get client
      let clientId = form.selectedClient?.id ?? null
      if (!clientId) {
        const fullName = `${form.newClient.name.trim()} ${form.newClient.lastName.trim()}`.trim()
        const { data: newClient, error: clientErr } = await db.from('clients').insert({
          name: fullName,
          type: form.newClient.type,
          phone: form.newClient.phone || null,
          telegram: form.newClient.telegram || null,
          source: form.newClient.source || null,
          referrer_id: form.newClient.referrerId || null,
          cashback_balance: 0,
          cashback_percent: 5,
          is_archived: false,
        }).select().single()

        if (clientErr || !newClient) {
          setErrors([`${t.orderCreate.errorClient}: ${clientErr?.message ?? t.common.error}`])
          setSubmitting(false)
          return
        }
        clientId = newClient.id
      }

      // 2. Apply cashback if toggled
      let cashbackApplied = 0
      if (form.applyCashback && form.selectedClient) {
        cashbackApplied = form.selectedClient.cashback_balance
        await db.from('clients').update({ cashback_balance: 0 }).eq('id', clientId)
        await db.from('cashback_transactions').insert({ client_id: clientId, type: 'spent', amount: cashbackApplied })
      }

      // 3. Calculate referrer cashback & create order
      const total = parseFloat(form.totalAmount) || 0
      let referrerCashback = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const referrer = (form.selectedClient as any)?.referrer as { cashback_percent?: number } | null
      if (form.selectedClient?.referrer_id && referrer?.cashback_percent && referrer.cashback_percent > 0) {
        referrerCashback = Math.round(total * referrer.cashback_percent / 100)
      }

      const { data: order, error: orderErr } = await db.from('orders').insert({
        client_id: clientId,
        manager_id: user!.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: 'new',
        priority: form.priority,
        is_urgent: form.isUrgent,
        deadline: form.deadline || null,
        total_amount: total,
        cost_price: parseFloat(form.costPrice) || 0,
        referrer_cashback: referrerCashback,
        cashback_applied: cashbackApplied,
      }).select().single()

      if (orderErr || !order) {
        setErrors([`${t.orderCreate.errorOrder}: ${orderErr?.message ?? t.common.error}`])
        setSubmitting(false)
        return
      }

      // 4. Create order items
      if (form.orderItems.length > 0) {
        await db.from('order_items').insert(
          form.orderItems.map((item) => ({
            order_id: order.id,
            service_id: item.serviceId || null,
            quantity: item.quantity ? parseFloat(item.quantity) : null,
            price_per_unit: item.pricePerUnit ? parseFloat(item.pricePerUnit) : null,
            total_price: parseFloat(item.totalPrice) || 0,
            is_manual_price: !item.isAutoTotal,
          }))
        )
      }

      // 5. Create payments
      const validPayments = form.payments.filter((p) => p.amount && p.dueDate)
      if (validPayments.length > 0) {
        await db.from('payments').insert(
          validPayments.map((p) => ({
            order_id: order.id,
            amount: parseFloat(p.amount),
            due_date: p.dueDate,
            payment_type: p.paymentType,
            is_paid: false,
          }))
        )
      }

      // 6. Create initial timeline entry
      await db.from('order_timeline').insert({
        order_id: order.id,
        user_id: user!.id,
        event_type: 'created',
        description: `Заказ создан менеджером ${user!.name}`,
      })

      setIsDirty(false)
      toastSuccess(t.orderCreate.createdSuccess)
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (e) {
      toastError(t.orderCreate.unknownError)
      setErrors([`${t.common.error}: ${String(e)}`])
      setSubmitting(false)
    }
  }

  // Step summary labels for sidebar
  const stepSummary = [
    form.selectedClient?.name
      ?? (form.newClient.name ? `${form.newClient.name} ${form.newClient.lastName}`.trim() : null),
    form.title || null,
    null,
  ]

  return (
    <div className="flex flex-col min-h-full page-enter">
      {/* Topbar */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
        <Breadcrumbs items={[{ label: t.nav.orders, to: '/dashboard' }, { label: t.orders.newOrder }]} />
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-2">{t.orderCreate.breadcrumb}</h1>
      </div>

      <div className="flex flex-1">
        {/* Steps sidebar */}
        <div className="w-56 shrink-0 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex flex-col gap-4">
            {STEPS.map(({ label }, i) => {
              const done = i < step
              const active = i === step
              const accessible = i <= step
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => accessible ? setStep(i) : undefined}
                  className={`flex items-start gap-3 text-left transition-colors ${accessible ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 mt-0.5 transition-colors ${
                    done ? 'bg-green-500 border-green-500 text-white'
                      : active ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${active ? 'text-blue-600' : done ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}`}>
                      {label}
                    </p>
                    {done && stepSummary[i] && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate max-w-32">{stepSummary[i]}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 p-8 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t.orderCreate.step} {step + 1}: {STEPS[step].label}
            </h2>
          </div>

          {step === 0 && <StepClient form={form} onChange={onChange} />}
          {step === 1 && <StepOrder form={form} onChange={onChange} />}
          {step === 2 && <StepPayment form={form} onChange={onChange} />}

          {errors.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <Button variant="secondary" onClick={handleBack} disabled={step === 0}>
              ← {t.common.back}
            </Button>

            {step < 2 ? (
              <Button onClick={handleNext} disabled={!canGoNext}>
                {t.common.next} →
              </Button>
            ) : (
              <Button variant="success" size="lg" onClick={handleSubmit} loading={submitting} disabled={!canGoNext}>
                {t.orderCreate.breadcrumb}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useOrder } from '../hooks/useOrder'
import { useAuthStore } from '../store/authStore'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { Spinner } from '../components/Spinner'
import type { OrderPriority } from '../types'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { toastSuccess, toastError } from '../lib/toast'
import { useT } from '../i18n'

export function OrderEditPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { order, loading } = useOrder(id)

  const priorityOptions = [
    { value: 'low',    label: t.priority.low },
    { value: 'medium', label: t.priority.medium },
    { value: 'high',   label: t.priority.high },
  ]

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<OrderPriority>('medium')
  const [isUrgent, setIsUrgent] = useState(false)
  const [totalAmount, setTotalAmount] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  useUnsavedChanges(isDirty && !saving)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  useEffect(() => {
    if (!order) return
    setTitle(order.title)
    setDescription(order.description ?? '')
    setDeadline(order.deadline ? order.deadline.slice(0, 10) : '')
    setPriority(order.priority)
    setIsUrgent(order.is_urgent)
    setTotalAmount(String(order.total_amount))
    setCostPrice(String(order.cost_price))
  }, [order])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-blue-600" /></div>
  }

  if (!order) {
    return <div className="p-8 text-center text-red-500">{t.orderEdit.notFound}</div>
  }

  if (order.status === 'cancelled' || order.status === 'completed') {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t.orderEdit.editingLocked}
      </div>
    )
  }

  const handleSave = async () => {
    if (!title.trim()) { setError(t.orderEdit.titleRequired); return }
    setSaving(true)
    setError(null)

    const { error: err } = await db.from('orders').update({
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline || null,
      priority,
      is_urgent: isUrgent,
      total_amount: parseFloat(totalAmount) || 0,
      cost_price: parseFloat(costPrice) || 0,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)

    if (err) {
      toastError(`${t.orderEdit.saveError}: ${err.message}`)
      setError(`${t.orderEdit.saveError}: ${err.message}`)
      setSaving(false)
      return
    }

    await db.from('order_timeline').insert({
      order_id: order.id,
      user_id: user!.id,
      event_type: 'comment',
      description: `Заказ отредактирован менеджером ${user!.name}`,
    })

    setIsDirty(false)
    toastSuccess(t.orderEdit.savedSuccess)
    navigate(`/orders/${order.id}`)
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs
          items={[
            { label: t.nav.orders, to: '/dashboard' },
            { label: `#${order.order_number} — ${order.title}`, to: `/orders/${order.id}` },
            { label: t.orderEdit.editBreadcrumb },
          ]}
        />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{t.orders.editOrder} #{order.order_number}</h1>
      </div>

      <div className="p-4 md:p-6 max-w-2xl flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-5">
          <Input
            label={t.orderEdit.titleLabel}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
            placeholder={t.orderEdit.titlePlaceholder}
          />

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{t.orderEdit.descriptionLabel}</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setIsDirty(true) }}
              rows={4}
              placeholder={t.orderEdit.descriptionPlaceholder}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.orderEdit.deadlineLabel}
              type="date"
              value={deadline}
              onChange={(e) => { setDeadline(e.target.value); setIsDirty(true) }}
            />
            <Select
              label={t.orderEdit.priorityLabel}
              options={priorityOptions}
              value={priority}
              onChange={(e) => { setPriority(e.target.value as OrderPriority); setIsDirty(true) }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.orderEdit.amountLabel}
              type="number"
              value={totalAmount}
              onChange={(e) => { setTotalAmount(e.target.value); setIsDirty(true) }}
            />
            <Input
              label={t.orderEdit.costPriceLabel}
              type="number"
              value={costPrice}
              onChange={(e) => { setCostPrice(e.target.value); setIsDirty(true) }}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.orderEdit.urgentTitle}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.orderEdit.urgentDesc}</p>
            </div>
            <button
              type="button"
              onClick={() => { setIsUrgent((v) => !v); setIsDirty(true) }}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${isUrgent ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isUrgent ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} loading={saving} disabled={!title.trim()}>
            {t.orderEdit.saveBtn}
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/orders/${order.id}`)}>
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </div>
  )
}

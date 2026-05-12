import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { localDb } from '../lib/localDb'
import { useOrder } from '../hooks/useOrder'
import { useAuthStore } from '../store/authStore'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { Spinner } from '../components/Spinner'
import { PriceInput } from '../components/PriceInput'
import { formatPriceInput, parsePriceInput } from '../utils/priceInput'
import type { OrderDetail, OrderPriority } from '../types'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { toastSuccess, toastError } from '../lib/toast'
import { useT } from '../i18n'

interface FormProps {
  order: OrderDetail
  orderId: string
}

function OrderEditForm({ order, orderId }: FormProps) {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const priorityOptions = [
    { value: 'low', label: t.priority.low },
    { value: 'medium', label: t.priority.medium },
    { value: 'high', label: t.priority.high },
  ]

  const [title, setTitle] = useState(order.title)
  const [description, setDescription] = useState(order.description ?? '')
  const [deadline, setDeadline] = useState(order.deadline ? order.deadline.slice(0, 10) : '')
  const [priority, setPriority] = useState<OrderPriority>(order.priority)
  const [isUrgent, setIsUrgent] = useState(order.is_urgent)
  const [totalAmount, setTotalAmount] = useState(formatPriceInput(order.total_amount))
  const [costPrice, setCostPrice] = useState(formatPriceInput(order.cost_price))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  useUnsavedChanges(isDirty && !saving)

  const markDirty = () => setIsDirty(true)

  const handleSave = async () => {
    if (!title.trim()) {
      setError(t.orderEdit.titleRequired)
      return
    }

    setSaving(true)
    setError(null)

    const { error: updateError } = await localDb
      .from('orders')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        priority,
        is_urgent: isUrgent,
        total_amount: parsePriceInput(totalAmount),
        cost_price: parsePriceInput(costPrice),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      toastError(`${t.orderEdit.saveError}: ${updateError.message}`)
      setError(`${t.orderEdit.saveError}: ${updateError.message}`)
      setSaving(false)
      return
    }

    await localDb.from('order_timeline').insert({
      order_id: order.id,
      user_id: user!.id,
      event_type: 'comment',
      description: `${t.orderEdit.timelineEdited} ${user!.name}`,
    })

    setIsDirty(false)
    toastSuccess(t.orderEdit.savedSuccess)
    navigate(`/orders/${orderId}`)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl flex flex-col gap-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-5">
        <Input
          label={t.orderEdit.titleLabel}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            markDirty()
          }}
          placeholder={t.orderEdit.titlePlaceholder}
        />

        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            {t.orderEdit.descriptionLabel}
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              markDirty()
            }}
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
            onChange={(e) => {
              setDeadline(e.target.value)
              markDirty()
            }}
          />
          <Select
            label={t.orderEdit.priorityLabel}
            options={priorityOptions}
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as OrderPriority)
              markDirty()
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <PriceInput
            label={t.orderEdit.amountLabel}
            value={totalAmount}
            onChange={(value) => {
              setTotalAmount(value)
              markDirty()
            }}
          />
          <PriceInput
            label={t.orderEdit.costPriceLabel}
            value={costPrice}
            onChange={(value) => {
              setCostPrice(value)
              markDirty()
            }}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.orderEdit.urgentTitle}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.orderEdit.urgentDesc}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsUrgent((value) => !value)
              markDirty()
            }}
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
        <Button variant="secondary" onClick={() => navigate(`/orders/${orderId}`)}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  )
}

export function OrderEditPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const { order, loading } = useOrder(id)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-blue-600" /></div>
  }

  if (!order || !id) {
    return <div className="p-8 text-center text-red-500">{t.orderEdit.notFound}</div>
  }

  if (order.status === 'cancelled' || order.status === 'completed') {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t.orderEdit.editingLocked}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs
          items={[
            { label: t.nav.orders, to: '/dashboard' },
            { label: `#${order.order_number} - ${order.title}`, to: `/orders/${order.id}` },
            { label: t.orderEdit.editBreadcrumb },
          ]}
        />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
          {t.orders.editOrder} #{order.order_number}
        </h1>
      </div>

      <OrderEditForm key={order.id} order={order} orderId={id} />
    </div>
  )
}

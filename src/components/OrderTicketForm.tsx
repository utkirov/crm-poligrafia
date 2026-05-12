import { useEffect, useState } from 'react'
import { createOrderTicket, localDb, updateOrderTicket } from '../lib/localDb'
import { Button } from './Button'
import { Input } from './Input'
import { toastError, toastSuccess } from '../lib/toast'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import type { OrderDetail, OrderTicketDetail, Profile } from '../types'

const COPY = {
  ru: {
    title: 'Название тикета',
    description: 'Описание',
    manager: 'Менеджер',
    designer: 'Дизайнер',
    deadline: 'Дедлайн',
    status: 'Статус',
    create: 'Создать тикет',
    save: 'Сохранить',
    cancel: 'Отмена',
    createSuccess: 'Тикет создан',
    updateSuccess: 'Тикет обновлён',
    loadError: 'Не удалось загрузить сотрудников',
    requiredManager: 'Выберите менеджера',
    requiredDesigner: 'Выберите дизайнера',
    requiredTitle: 'Введите название тикета',
    invalidManager: 'Для тикета нужен сотрудник с ролью менеджера',
    new: 'Новый',
    in_progress: 'В работе',
    done: 'Готово',
    descriptionPlaceholder: 'Что нужно сделать по заказу',
    productionSuffix: 'производство',
  },
  uz: {
    title: 'Tiket nomi',
    description: 'Tavsif',
    manager: 'Menejer',
    designer: 'Dizayner',
    deadline: 'Muddat',
    status: 'Status',
    create: 'Tiket yaratish',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    createSuccess: 'Tiket yaratildi',
    updateSuccess: 'Tiket yangilandi',
    loadError: 'Xodimlarni yuklab bo‘lmadi',
    requiredManager: 'Menejerni tanlang',
    requiredDesigner: 'Dizaynerni tanlang',
    requiredTitle: 'Tiket nomini kiriting',
    invalidManager: 'Tiket uchun manager roli bo‘lgan xodim kerak',
    new: 'Yangi',
    in_progress: 'Ishda',
    done: 'Tayyor',
    descriptionPlaceholder: 'Buyurtma bo‘yicha vazifa tavsifi',
    productionSuffix: 'ishlab chiqarish',
  },
} as const

interface OrderTicketFormProps {
  order: Pick<OrderDetail, 'id' | 'title' | 'description' | 'deadline' | 'manager'>
  ticket?: OrderTicketDetail | null
  onSuccess: () => void
  onCancel?: () => void
}

export function OrderTicketForm({ order, ticket, onSuccess, onCancel }: OrderTicketFormProps) {
  const locale = useSettingsStore((state) => state.locale)
  const user = useAuthStore((state) => state.user)
  const copy = COPY[locale]
  const [managers, setManagers] = useState<Profile[]>([])
  const [designers, setDesigners] = useState<Profile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState(ticket?.title ?? `${order.title} - ${copy.productionSuffix}`)
  const [description, setDescription] = useState(ticket?.description ?? order.description ?? '')
  const [status, setStatus] = useState<'new' | 'in_progress' | 'done'>(ticket?.status ?? 'new')
  const [managerId, setManagerId] = useState(ticket?.manager_assignee.id ?? order.manager.id)
  const [designerId, setDesignerId] = useState(ticket?.designer_assignee.id ?? '')
  const [deadline, setDeadline] = useState(ticket?.deadline ?? order.deadline ?? '')

  const canEditAssignments = user?.role === 'director' || user?.role === 'manager'
  const managerLocked = user?.role === 'manager'
  const effectiveManagerId =
    ticket || managerLocked || managers.some((profile) => profile.id === managerId)
      ? managerId
      : (managers[0]?.id ?? '')

  useEffect(() => {
    let cancelled = false

    const loadProfiles = async () => {
      const { data, error } = await localDb.from('profiles').select('*').eq('is_active', true)
      if (cancelled) return

      if (error) {
        toastError(copy.loadError)
        return
      }

      const profiles = (data ?? []) as Profile[]
      setManagers(profiles.filter((profile) => profile.role === 'manager'))
      setDesigners(profiles.filter((profile) => profile.role === 'designer'))
    }

    void loadProfiles()

    return () => {
      cancelled = true
    }
  }, [copy.loadError])

  const handleSubmit = async () => {
    if (!title.trim()) {
      toastError(copy.requiredTitle)
      return
    }

    if (!effectiveManagerId) {
      toastError(copy.requiredManager)
      return
    }

    if (!designerId) {
      toastError(copy.requiredDesigner)
      return
    }

    setSubmitting(true)

    const payload = {
      order_id: order.id,
      title: title.trim(),
      description: description.trim() || null,
      status,
      manager_assignee_id: effectiveManagerId,
      designer_assignee_id: designerId,
      deadline: deadline || null,
      created_by: ticket?.created_by ?? user!.id,
    }

    const result = ticket
      ? await updateOrderTicket(ticket.id, {
          title: payload.title,
          description: payload.description,
          status: payload.status,
          manager_assignee_id: payload.manager_assignee_id,
          designer_assignee_id: payload.designer_assignee_id,
          deadline: payload.deadline,
        })
      : await createOrderTicket(payload)

    setSubmitting(false)

    if (result.error) {
      const errorMap: Record<string, string> = {
        invalid_manager_assignee: copy.invalidManager,
        invalid_designer_assignee: copy.requiredDesigner,
        missing_title: copy.requiredTitle,
      }
      toastError(errorMap[result.error] ?? result.error)
      return
    }

    toastSuccess(ticket ? copy.updateSuccess : copy.createSuccess)
    onSuccess()
  }

  return (
    <div className="space-y-4">
      <Input label={copy.title} value={title} onChange={(event) => setTitle(event.target.value)} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{copy.description}</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder={copy.descriptionPlaceholder}
          className="px-3 py-2 rounded-lg border text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors duration-150"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{copy.manager}</label>
          <select
            value={effectiveManagerId}
            onChange={(event) => setManagerId(event.target.value)}
            disabled={!canEditAssignments || managerLocked}
            className="px-3 py-2 rounded-lg border text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 disabled:opacity-70"
          >
            {managers.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{copy.designer}</label>
          <select
            value={designerId}
            onChange={(event) => setDesignerId(event.target.value)}
            disabled={!canEditAssignments}
            className="px-3 py-2 rounded-lg border text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 disabled:opacity-70"
          >
            <option value="" />
            {designers.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{copy.deadline}</label>
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="px-3 py-2 rounded-lg border text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{copy.status}</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as 'new' | 'in_progress' | 'done')}
            className="px-3 py-2 rounded-lg border text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
          >
            <option value="new">{copy.new}</option>
            <option value="in_progress">{copy.in_progress}</option>
            <option value="done">{copy.done}</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            {copy.cancel}
          </Button>
        ) : null}
        <Button onClick={handleSubmit} loading={submitting}>
          {ticket ? copy.save : copy.create}
        </Button>
      </div>
    </div>
  )
}

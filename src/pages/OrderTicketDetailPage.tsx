import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { OrderTicketForm } from '../components/OrderTicketForm'
import { OrderTicketStatusBadge } from '../components/OrderTicketStatusBadge'
import { Spinner } from '../components/Spinner'
import { updateOrderTicket } from '../lib/localDb'
import { toastSuccess } from '../lib/toast'
import { useOrderTicket } from '../hooks/useOrderTicket'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { formatDate, formatDateTime } from '../utils/format'
import type { OrderTicketStatus } from '../types'

const COPY = {
  ru: {
    title: 'Тикет',
    manager: 'Менеджер',
    designer: 'Дизайнер',
    deadline: 'Дедлайн',
    createdBy: 'Создал',
    updatedAt: 'Обновлён',
    description: 'Описание',
    edit: 'Редактировать',
    goToOrder: 'Открыть заказ',
    updateStatus: 'Изменить статус',
    notFound: 'Тикет не найден',
    new: 'Новый',
    in_progress: 'В работе',
    done: 'Готово',
    statusUpdated: 'Статус тикета обновлён',
    noDescription: 'Описание не указано',
  },
  uz: {
    title: 'Tiket',
    manager: 'Menejer',
    designer: 'Dizayner',
    deadline: 'Muddat',
    createdBy: 'Yaratgan',
    updatedAt: 'Yangilangan',
    description: 'Tavsif',
    edit: 'Tahrirlash',
    goToOrder: 'Buyurtmani ochish',
    updateStatus: 'Statusni o‘zgartirish',
    notFound: 'Tiket topilmadi',
    new: 'Yangi',
    in_progress: 'Ishda',
    done: 'Tayyor',
    statusUpdated: 'Tiket statusi yangilandi',
    noDescription: 'Tavsif ko‘rsatilmagan',
  },
} as const

export function OrderTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const locale = useSettingsStore((state) => state.locale)
  const user = useAuthStore((state) => state.user)
  const { ticket, loading, error, refetch } = useOrderTicket(id)
  const [editOpen, setEditOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<OrderTicketStatus | null>(null)
  const copy = COPY[locale]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    )
  }

  if (error || !ticket) {
    return <div className="p-8 text-center text-red-500">{error ?? copy.notFound}</div>
  }

  const canEdit = user?.role === 'director' || user?.role === 'manager'
  const canUpdateStatus = canEdit || user?.role === 'designer'

  const handleStatusChange = async (status: OrderTicketStatus) => {
    if (status === ticket.status) {
      return
    }

    setUpdatingStatus(status)
    const { error: updateError } = await updateOrderTicket(ticket.id, { status })
    setUpdatingStatus(null)

    if (!updateError) {
      toastSuccess(copy.statusUpdated)
      refetch()
    }
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs
          items={[
            { label: locale === 'uz' ? 'Tiketlar' : 'Тикеты', to: '/tickets' },
            { label: ticket.title },
          ]}
        />
        <div className="flex items-center justify-between mt-2 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{ticket.title}</h1>
            <OrderTicketStatusBadge status={ticket.status} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(`/orders/${ticket.order.id}`)}>
              {copy.goToOrder}
            </Button>
            {canEdit ? (
              <Button onClick={() => setEditOpen(true)}>
                {copy.edit}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-6 min-w-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{copy.description}</h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
              {ticket.description || copy.noDescription}
            </p>
          </div>

          {canUpdateStatus ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{copy.updateStatus}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {(['new', 'in_progress', 'done'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={ticket.status === status ? 'primary' : 'secondary'}
                    loading={updatingStatus === status}
                    onClick={() => handleStatusChange(status)}
                  >
                    {copy[status]}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{copy.title}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-400 dark:text-slate-500">{locale === 'uz' ? 'Buyurtma' : 'Заказ'}</p>
                <Link to={`/orders/${ticket.order.id}`} className="text-blue-600 hover:underline">
                  #{ticket.order.order_number} {ticket.order.title}
                </Link>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500">{copy.manager}</p>
                <p className="text-slate-900 dark:text-slate-100">{ticket.manager_assignee.name}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500">{copy.designer}</p>
                <p className="text-slate-900 dark:text-slate-100">{ticket.designer_assignee.name}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500">{copy.deadline}</p>
                <p className="text-slate-900 dark:text-slate-100">{ticket.deadline ? formatDate(ticket.deadline) : '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500">{copy.createdBy}</p>
                <p className="text-slate-900 dark:text-slate-100">{ticket.created_by_user.name}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500">{copy.updatedAt}</p>
                <p className="text-slate-900 dark:text-slate-100">{formatDateTime(ticket.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={copy.edit}
        className="max-w-2xl"
      >
        <OrderTicketForm
          order={ticket.order}
          ticket={ticket}
          onCancel={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false)
            refetch()
          }}
        />
      </Modal>
    </div>
  )
}

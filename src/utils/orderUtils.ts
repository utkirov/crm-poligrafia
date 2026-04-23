import type { OrderStatus, OrderPriority } from '../types'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  ready: 'Готов',
  completed: 'Завершён',
  cancelled: 'Отменён',
}

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: 'in_progress',
  in_progress: 'ready',
  ready: 'completed',
}

export const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  new: 'Взять в работу',
  in_progress: 'Отметить готовым',
  ready: 'Завершить заказ',
}

export const KANBAN_COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'new', label: 'Новый' },
  { status: 'in_progress', label: 'В работе' },
  { status: 'ready', label: 'Готов' },
  { status: 'completed', label: 'Завершён' },
]

export const PAYMENT_TYPE_LABELS = {
  cash: 'Наличные',
  transfer: 'Перевод',
  bank_transfer: 'Банк. перевод',
} as const

export const STATUS_STEP: Record<OrderStatus, number> = {
  new: 0,
  in_progress: 1,
  ready: 2,
  completed: 3,
  cancelled: -1,
}

import type { OrderPriority, OrderStatus } from '../types'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  ready: 'Готов',
  completed: 'Завершен',
  cancelled: 'Отменен',
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

export const ORDER_STATUSES: OrderStatus[] = ['new', 'in_progress', 'ready', 'completed', 'cancelled']

export const ORDER_PRIORITIES: OrderPriority[] = ['low', 'medium', 'high']

export const KANBAN_COLUMNS: { status: OrderStatus }[] = [
  { status: 'new' },
  { status: 'in_progress' },
  { status: 'ready' },
  { status: 'completed' },
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

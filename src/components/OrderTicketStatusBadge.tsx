import { Badge } from './Badge'
import type { OrderTicketStatus } from '../types'
import { useSettingsStore } from '../store/settingsStore'

const COPY = {
  ru: {
    new: 'Новый',
    in_progress: 'В работе',
    done: 'Готово',
  },
  uz: {
    new: 'Yangi',
    in_progress: 'Ishda',
    done: 'Tayyor',
  },
} as const

export function OrderTicketStatusBadge({ status }: { status: OrderTicketStatus }) {
  const locale = useSettingsStore((state) => state.locale)
  const color = status === 'done' ? 'green' : status === 'in_progress' ? 'blue' : 'gray'

  return <Badge color={color}>{COPY[locale][status]}</Badge>
}

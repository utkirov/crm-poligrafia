import { Badge } from './Badge'
import { useT } from '../i18n'
import type { OrderStatus } from '../types'

const statusColor: Record<OrderStatus, 'blue' | 'yellow' | 'green' | 'gray' | 'red'> = {
  new:        'blue',
  in_progress:'yellow',
  ready:      'green',
  completed:  'gray',
  cancelled:  'red',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useT()
  const labels: Record<OrderStatus, string> = {
    new:        t.status.new,
    in_progress:t.status.in_progress,
    ready:      t.status.ready,
    completed:  t.status.completed,
    cancelled:  t.status.cancelled,
  }
  return <Badge color={statusColor[status]}>{labels[status]}</Badge>
}

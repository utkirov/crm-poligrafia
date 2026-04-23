import { Badge } from './Badge'
import { useT } from '../i18n'
import type { OrderPriority } from '../types'

const priorityColor: Record<OrderPriority, 'green' | 'yellow' | 'red'> = {
  low:   'green',
  medium:'yellow',
  high:  'red',
}

export function PriorityBadge({ priority }: { priority: OrderPriority }) {
  const t = useT()
  const labels: Record<OrderPriority, string> = {
    low:   t.priority.low,
    medium:t.priority.medium,
    high:  t.priority.high,
  }
  return <Badge color={priorityColor[priority]}>{labels[priority]}</Badge>
}

import type { OrderWithClient } from '../types'

export type WorkspaceView = 'all' | 'new' | 'in_progress' | 'ready' | 'overdue' | 'today'

const WORKSPACE_VIEWS: WorkspaceView[] = ['all', 'new', 'in_progress', 'ready', 'overdue', 'today']

export function parseWorkspaceView(raw: string | null | undefined): WorkspaceView {
  return WORKSPACE_VIEWS.includes(raw as WorkspaceView) ? (raw as WorkspaceView) : 'all'
}

export function filterWorkspaceOrders(
  orders: OrderWithClient[],
  options: { view: WorkspaceView; search: string; today: string },
) {
  const query = options.search.trim().toLowerCase()

  return orders.filter((order) => {
    const overdue = !!order.deadline && order.deadline < options.today && order.status !== 'completed' && order.status !== 'cancelled'
    const isToday = order.deadline === options.today
    const matchesView =
      options.view === 'all' ||
      (options.view === 'overdue' && overdue) ||
      (options.view === 'today' && isToday) ||
      order.status === options.view

    if (!matchesView) return false
    if (!query) return true

    return [
      order.title,
      order.client?.name ?? '',
      String(order.order_number ?? ''),
    ].join(' ').toLowerCase().includes(query)
  })
}

export function getWorkspaceCounts(orders: OrderWithClient[], today: string) {
  return {
    all: orders.length,
    new: orders.filter((order) => order.status === 'new').length,
    in_progress: orders.filter((order) => order.status === 'in_progress').length,
    ready: orders.filter((order) => order.status === 'ready').length,
    overdue: orders.filter((order) => !!order.deadline && order.deadline < today && !['completed', 'cancelled'].includes(order.status)).length,
    today: orders.filter((order) => order.deadline === today).length,
  }
}

export function getDefaultSelectedOrderId(orders: OrderWithClient[], selectedOrderId: string | null) {
  if (selectedOrderId && orders.some((order) => order.id === selectedOrderId)) {
    return selectedOrderId
  }

  return orders[0]?.id ?? null
}

import { describe, expect, it } from 'vitest'

import {
  filterWorkspaceOrders,
  getDefaultSelectedOrderId,
  getWorkspaceCounts,
  parseWorkspaceView,
} from './orderWorkspace'

const orders = [
  { id: '1', status: 'new',         title: 'Banner',        deadline: '2026-05-12', updated_at: '2026-05-12T08:00:00Z', created_at: '2026-05-11T08:00:00Z', is_urgent: false, total_amount: 100000, client: { name: 'Acme' } },
  { id: '2', status: 'in_progress', title: 'Business card', deadline: '2026-05-10', updated_at: '2026-05-12T09:00:00Z', created_at: '2026-05-09T08:00:00Z', is_urgent: true,  total_amount: 250000, client: { name: 'Nova' } },
  { id: '3', status: 'ready',       title: 'Flyer',         deadline: '2026-05-12', updated_at: '2026-05-12T10:00:00Z', created_at: '2026-05-08T08:00:00Z', is_urgent: false, total_amount: 150000, client: { name: 'Atlas' } },
]

describe('orderWorkspace helpers', () => {
  it('falls back to all for unknown views', () => {
    expect(parseWorkspaceView('weird')).toBe('all')
  })

  it('filters overdue orders', () => {
    const result = filterWorkspaceOrders(orders as never[], { view: 'overdue', search: '', today: '2026-05-12' })
    expect(result.map((order) => order.id)).toEqual(['2'])
  })

  it('computes counts for all views', () => {
    expect(getWorkspaceCounts(orders as never[], '2026-05-12')).toMatchObject({
      all: 3,
      new: 1,
      in_progress: 1,
      ready: 1,
      overdue: 1,
      today: 2,
    })
  })

  it('selects the first filtered order when current selection is invalid', () => {
    const filtered = filterWorkspaceOrders(orders as never[], { view: 'ready', search: '', today: '2026-05-12' })
    expect(getDefaultSelectedOrderId(filtered, 'missing')).toBe('3')
  })
})

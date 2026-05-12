import { describe, expect, it } from 'vitest'
import { canAssignTicketRole, isValidOrderTicketStatus, validateOrderTicketInput } from './ticketUtils'

describe('ticketUtils', () => {
  it('accepts only supported ticket statuses', () => {
    expect(isValidOrderTicketStatus('new')).toBe(true)
    expect(isValidOrderTicketStatus('in_progress')).toBe(true)
    expect(isValidOrderTicketStatus('done')).toBe(true)
    expect(isValidOrderTicketStatus('completed')).toBe(false)
  })

  it('enforces assignee roles', () => {
    expect(canAssignTicketRole('manager', 'manager')).toBe(true)
    expect(canAssignTicketRole('designer', 'designer')).toBe(true)
    expect(canAssignTicketRole('manager', 'designer')).toBe(false)
  })

  it('rejects ticket input without order id', () => {
    expect(validateOrderTicketInput({
      title: 'Banner',
      status: 'new',
      manager_assignee_role: 'manager',
      designer_assignee_role: 'designer',
    })).toEqual({ valid: false, error: 'missing_order_id' })
  })
})

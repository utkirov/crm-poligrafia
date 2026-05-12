import type { OrderTicketStatus, UserRole } from '../types'

const TICKET_STATUSES: OrderTicketStatus[] = ['new', 'in_progress', 'done']

export function isValidOrderTicketStatus(value: string): value is OrderTicketStatus {
  return TICKET_STATUSES.includes(value as OrderTicketStatus)
}

export function canAssignTicketRole(expected: 'manager' | 'designer', actual: UserRole) {
  return expected === actual
}

export function validateOrderTicketInput(input: {
  order_id?: string
  title?: string
  status?: string
  manager_assignee_role?: UserRole
  designer_assignee_role?: UserRole
}) {
  if (!input.order_id) return { valid: false as const, error: 'missing_order_id' as const }
  if (!input.title?.trim()) return { valid: false as const, error: 'missing_title' as const }
  if (!input.status || !isValidOrderTicketStatus(input.status)) {
    return { valid: false as const, error: 'invalid_status' as const }
  }
  if (!input.manager_assignee_role || !canAssignTicketRole('manager', input.manager_assignee_role)) {
    return { valid: false as const, error: 'invalid_manager_assignee' as const }
  }
  if (!input.designer_assignee_role || !canAssignTicketRole('designer', input.designer_assignee_role)) {
    return { valid: false as const, error: 'invalid_designer_assignee' as const }
  }

  return { valid: true as const }
}

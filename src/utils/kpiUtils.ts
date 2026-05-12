import type {
  KpiEligibleRole,
  MonthlyKpiField,
  MonthlyKpiInput,
} from '../types'

const MANAGER_FIELDS: MonthlyKpiField[] = [
  'sales_plan',
  'orders_plan',
  'new_clients_plan',
]
const DESIGNER_FIELDS: MonthlyKpiField[] = [
  'tasks_plan',
  'on_time_rate_plan',
  'revision_limit_plan',
]

export function normalizeKpiMonth(value: string) {
  const [year = '', rawMonth = ''] = value.split('-')
  const month = rawMonth.padStart(2, '0')
  return `${year}-${month}`
}

export function isKpiEligibleRole(role: string): role is KpiEligibleRole {
  return role === 'manager' || role === 'designer'
}

export function getRoleKpiFields(role: KpiEligibleRole) {
  return role === 'manager' ? MANAGER_FIELDS : DESIGNER_FIELDS
}

export function sanitizeMonthlyKpiPayload(input: MonthlyKpiInput) {
  const normalizedMonth = normalizeKpiMonth(input.month)

  if (!isKpiEligibleRole(input.role)) {
    return {
      ...input,
      month: normalizedMonth,
      sales_plan: null,
      orders_plan: null,
      new_clients_plan: null,
      tasks_plan: null,
      on_time_rate_plan: null,
      revision_limit_plan: null,
    }
  }

  const isManager = input.role === 'manager'

  return {
    user_id: input.user_id,
    month: normalizedMonth,
    role: input.role,
    sales_plan: isManager ? input.sales_plan ?? 0 : null,
    orders_plan: isManager ? input.orders_plan ?? 0 : null,
    new_clients_plan: isManager ? input.new_clients_plan ?? 0 : null,
    tasks_plan: isManager ? null : input.tasks_plan ?? 0,
    on_time_rate_plan: isManager ? null : input.on_time_rate_plan ?? 0,
    revision_limit_plan: isManager ? null : input.revision_limit_plan ?? 0,
  }
}

export function validateMonthlyKpiInput(input: Partial<MonthlyKpiInput>) {
  if (!input.month || !/^\d{4}-\d{1,2}$/.test(input.month)) {
    return { valid: false as const, error: 'invalid_month' as const }
  }

  if (!input.role || !isKpiEligibleRole(input.role)) {
    return { valid: false as const, error: 'unsupported_role' as const }
  }

  if (
    typeof input.on_time_rate_plan === 'number' &&
    (input.on_time_rate_plan < 0 || input.on_time_rate_plan > 100)
  ) {
    return {
      valid: false as const,
      error: 'invalid_on_time_rate' as const,
    }
  }

  const values = [
    input.sales_plan,
    input.orders_plan,
    input.new_clients_plan,
    input.tasks_plan,
    input.on_time_rate_plan,
    input.revision_limit_plan,
  ]

  if (values.some((value) => typeof value === 'number' && value < 0)) {
    return { valid: false as const, error: 'negative_value' as const }
  }

  return { valid: true as const }
}

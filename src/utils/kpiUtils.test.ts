import { describe, expect, it } from 'vitest'

import {
  getRoleKpiFields,
  normalizeKpiMonth,
  sanitizeMonthlyKpiPayload,
  validateMonthlyKpiInput,
} from './kpiUtils'

describe('kpiUtils', () => {
  it('normalizes month values', () => {
    expect(normalizeKpiMonth('2026-5')).toBe('2026-05')
    expect(normalizeKpiMonth('2026-05')).toBe('2026-05')
  })

  it('keeps only manager KPI fields for manager payload', () => {
    expect(
      sanitizeMonthlyKpiPayload({
        user_id: 'u1',
        month: '2026-05',
        role: 'manager',
        sales_plan: 1000000,
        orders_plan: 30,
        new_clients_plan: 10,
        tasks_plan: 99,
      }),
    ).toMatchObject({
      role: 'manager',
      sales_plan: 1000000,
      orders_plan: 30,
      new_clients_plan: 10,
      tasks_plan: null,
    })
  })

  it('keeps only designer KPI fields for designer payload', () => {
    expect(
      sanitizeMonthlyKpiPayload({
        user_id: 'u2',
        month: '2026-05',
        role: 'designer',
        tasks_plan: 40,
        on_time_rate_plan: 95,
        revision_limit_plan: 2,
        sales_plan: 500,
      }),
    ).toMatchObject({
      role: 'designer',
      tasks_plan: 40,
      on_time_rate_plan: 95,
      revision_limit_plan: 2,
      sales_plan: null,
    })
  })

  it('rejects invalid on-time rate values', () => {
    expect(
      validateMonthlyKpiInput({
        role: 'designer',
        month: '2026-05',
        on_time_rate_plan: 120,
      }),
    ).toEqual({ valid: false, error: 'invalid_on_time_rate' })
  })

  it('rejects KPI input for unsupported roles', () => {
    expect(
      validateMonthlyKpiInput({
        role: 'director',
        month: '2026-05',
      }),
    ).toEqual({ valid: false, error: 'unsupported_role' })
  })

  it('returns allowed KPI fields by role', () => {
    expect(getRoleKpiFields('manager')).toEqual([
      'sales_plan',
      'orders_plan',
      'new_clients_plan',
    ])
    expect(getRoleKpiFields('designer')).toEqual([
      'tasks_plan',
      'on_time_rate_plan',
      'revision_limit_plan',
    ])
  })
})

export type KpiEligibleRole = 'manager' | 'designer'

export type ManagerKpiField =
  | 'sales_plan'
  | 'orders_plan'
  | 'new_clients_plan'

export type DesignerKpiField =
  | 'tasks_plan'
  | 'on_time_rate_plan'
  | 'revision_limit_plan'

export type MonthlyKpiField = ManagerKpiField | DesignerKpiField

export interface MonthlyKpiInput {
  user_id: string
  month: string
  role: string
  sales_plan?: number | null
  orders_plan?: number | null
  new_clients_plan?: number | null
  tasks_plan?: number | null
  on_time_rate_plan?: number | null
  revision_limit_plan?: number | null
}

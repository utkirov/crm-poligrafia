export type UserRole = 'director' | 'financier' | 'manager' | 'designer'
export type ClientType = 'individual' | 'company' | 'agent'
export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'completed' | 'cancelled'
export type OrderPriority = 'low' | 'medium' | 'high'
export type PaymentType = 'cash' | 'transfer' | 'bank_transfer'
export type CashbackType = 'earned_own' | 'earned_referral' | 'spent'
export type TimelineEventType = 'created' | 'status_changed' | 'comment' | 'payment' | 'cancelled'
export type OrderTicketStatus = 'new' | 'in_progress' | 'done'

export interface Profile {
  id: string
  name: string
  role: UserRole
  login: string | null
  is_active: boolean
  created_at: string
}

export interface Client {
  id: string
  name: string
  type: ClientType
  phone: string | null
  telegram: string | null
  birthday: string | null
  source: string | null
  cashback_balance: number
  cashback_percent: number
  referrer_id: string | null
  is_archived: boolean
  created_at: string
}

export interface ServiceCategory {
  id: string
  name: string
  icon: string | null
}

export interface ServiceSubcategory {
  id: string
  category_id: string
  name: string
}

export interface Service {
  id: string
  subcategory_id: string
  name: string
  unit_of_measure: string
  price_per_unit: number
  is_archived: boolean
  created_at: string
}

export interface Order {
  id: string
  client_id: string
  manager_id: string
  title: string
  description: string | null
  status: OrderStatus
  priority: OrderPriority
  is_urgent: boolean
  deadline: string | null
  total_amount: number
  cost_price: number
  referrer_cashback: number
  cashback_applied: number
  cancel_reason: string | null
  cancel_comment: string | null
  order_number: number
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  service_id: string | null
  quantity: number | null
  price_per_unit: number | null
  total_price: number
  is_manual_price: boolean
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  due_date: string | null
  payment_type: PaymentType | null
  is_paid: boolean
  paid_at: string | null
}

export interface OrderTimelineEntry {
  id: string
  order_id: string
  user_id: string
  event_type: TimelineEventType
  description: string | null
  created_at: string
}

export interface CashbackTransaction {
  id: string
  client_id: string
  order_id: string | null
  type: CashbackType
  amount: number
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  order_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

export interface CancelReason {
  id: string
  reason: string
  is_active: boolean
  created_at: string
}

export interface MonthlyKpi {
  id: string
  user_id: string
  month: string
  role: 'manager' | 'designer'
  sales_plan: number | null
  orders_plan: number | null
  new_clients_plan: number | null
  tasks_plan: number | null
  on_time_rate_plan: number | null
  revision_limit_plan: number | null
  created_at: string
  updated_at: string
}

export interface OrderTicket {
  id: string
  order_id: string
  title: string
  description: string | null
  status: OrderTicketStatus
  manager_assignee_id: string
  designer_assignee_id: string
  deadline: string | null
  created_by: string
  created_at: string
  updated_at: string
}

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile, Omit<Profile, 'created_at'>>
      clients: TableDef<Client, Omit<Client, 'id' | 'created_at'>>
      service_categories: TableDef<ServiceCategory, Omit<ServiceCategory, 'id'>>
      service_subcategories: TableDef<ServiceSubcategory, Omit<ServiceSubcategory, 'id'>>
      services: TableDef<Service, Omit<Service, 'id' | 'created_at'>>
      orders: TableDef<Order, Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_number'>>
      order_items: TableDef<OrderItem, Omit<OrderItem, 'id'>>
      payments: TableDef<Payment, Omit<Payment, 'id'>>
      order_timeline: TableDef<OrderTimelineEntry, Omit<OrderTimelineEntry, 'id' | 'created_at'>>
      cashback_transactions: TableDef<CashbackTransaction, Omit<CashbackTransaction, 'id' | 'created_at'>>
      notifications: TableDef<Notification, Omit<Notification, 'id' | 'created_at'>>
      cancel_reasons: TableDef<CancelReason, Omit<CancelReason, 'id' | 'created_at'>, Partial<Omit<CancelReason, 'id' | 'created_at'>>>
      monthly_kpis: TableDef<
        MonthlyKpi,
        Omit<MonthlyKpi, 'id' | 'created_at' | 'updated_at'>,
        Partial<Omit<MonthlyKpi, 'id' | 'created_at' | 'updated_at'>>
      >
      order_tickets: TableDef<
        OrderTicket,
        Omit<OrderTicket, 'id' | 'created_at' | 'updated_at'>,
        Partial<Omit<OrderTicket, 'id' | 'created_at' | 'updated_at'>>
      >
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

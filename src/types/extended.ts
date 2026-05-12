import type {
  Order, Client, Profile, OrderItem, Service,
  ServiceSubcategory, ServiceCategory, Payment, OrderTimelineEntry,
  OrderTicket,
} from './database'

export interface OrderWithClient extends Order {
  order_number: number
  client: Pick<Client, 'id' | 'name' | 'phone' | 'telegram' | 'cashback_balance' | 'cashback_percent'>
  manager: Pick<Profile, 'id' | 'name'>
}

export interface ServiceFull extends Service {
  subcategory: ServiceSubcategory & {
    category: ServiceCategory
  }
}

export interface OrderItemFull extends OrderItem {
  service: ServiceFull | null
}

export interface TimelineEntryWithUser extends OrderTimelineEntry {
  user: Pick<Profile, 'id' | 'name'>
}

export interface ClientWithReferrer extends Client {
  referrer: Pick<Client, 'id' | 'name' | 'cashback_percent' | 'cashback_balance'> | null
}

export interface OrderTicketDetail extends OrderTicket {
  order: OrderWithClient
  manager_assignee: Pick<Profile, 'id' | 'name'>
  designer_assignee: Pick<Profile, 'id' | 'name'>
  created_by_user: Pick<Profile, 'id' | 'name'>
}

export interface OrderDetail extends Omit<Order, ''> {
  order_number: number
  client: ClientWithReferrer
  manager: Pick<Profile, 'id' | 'name'>
  order_items: OrderItemFull[]
  payments: Payment[]
  order_timeline: TimelineEntryWithUser[]
  order_ticket?: OrderTicketDetail | null
}

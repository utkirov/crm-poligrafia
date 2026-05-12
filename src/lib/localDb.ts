import type {
  CancelReason,
  CashbackTransaction,
  Client,
  MonthlyKpi,
  MonthlyKpiInput,
  Order,
  OrderItem,
  OrderPriority,
  OrderTicket,
  OrderTimelineEntry,
  Payment,
  Profile,
  Service,
  ServiceCategory,
  ServiceSubcategory,
  UserRole,
} from '../types'
import {
  sanitizeMonthlyKpiPayload,
  validateMonthlyKpiInput,
} from '../utils/kpiUtils'
import { validateOrderTicketInput } from '../utils/ticketUtils'

type TableName =
  | 'profiles'
  | 'clients'
  | 'service_categories'
  | 'service_subcategories'
  | 'services'
  | 'orders'
  | 'order_items'
  | 'payments'
  | 'order_timeline'
  | 'cashback_transactions'
  | 'notifications'
  | 'cancel_reasons'
  | 'monthly_kpis'
  | 'order_tickets'

interface NotificationRow {
  id: string
  user_id: string
  type: string
  order_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

interface LocalAuthAccount {
  id: string
  email: string
  password: string
}

interface LocalSession {
  access_token: string
  user: {
    id: string
    email: string
  }
}

interface LocalDatabaseState {
  profiles: Profile[]
  clients: Client[]
  service_categories: ServiceCategory[]
  service_subcategories: ServiceSubcategory[]
  services: Service[]
  orders: Order[]
  order_items: OrderItem[]
  payments: Payment[]
  order_timeline: OrderTimelineEntry[]
  cashback_transactions: CashbackTransaction[]
  notifications: NotificationRow[]
  cancel_reasons: CancelReason[]
  monthly_kpis: MonthlyKpi[]
  order_tickets: OrderTicket[]
  auth_accounts: LocalAuthAccount[]
}

type LocalInsertMap = {
  profiles: Partial<Profile> & Pick<Profile, 'name' | 'role' | 'login'>
  clients: Partial<Client> & Pick<Client, 'name' | 'type'>
  service_categories: Partial<ServiceCategory> & Pick<ServiceCategory, 'name'>
  service_subcategories: Partial<ServiceSubcategory> & Pick<ServiceSubcategory, 'name' | 'category_id'>
  services: Partial<Service> & Pick<Service, 'name' | 'subcategory_id' | 'unit_of_measure' | 'price_per_unit'>
  orders: Partial<Order> & Pick<Order, 'client_id' | 'manager_id' | 'title'>
  order_items: Partial<OrderItem> & Pick<OrderItem, 'order_id' | 'total_price'>
  payments: Partial<Payment> & Pick<Payment, 'order_id' | 'amount'>
  order_timeline: Partial<OrderTimelineEntry> & Pick<OrderTimelineEntry, 'order_id' | 'user_id' | 'event_type'>
  cashback_transactions: Partial<CashbackTransaction> & Pick<CashbackTransaction, 'client_id' | 'type' | 'amount'>
  notifications: Partial<NotificationRow> & Pick<NotificationRow, 'user_id' | 'type' | 'message'>
  cancel_reasons: Partial<CancelReason> & Pick<CancelReason, 'reason'>
  monthly_kpis: Omit<MonthlyKpi, 'id' | 'created_at' | 'updated_at'>
  order_tickets: Omit<OrderTicket, 'id' | 'created_at' | 'updated_at'>
}

type LocalUpdateMap = {
  [K in TableName]: Partial<LocalDatabaseState[K][number]>
}

interface QueryResult<T> {
  data: T | null
  error: null | { message: string }
}

type Filter =
  | { type: 'eq'; field: string; value: unknown }
  | { type: 'in'; field: string; value: unknown[] }
  | { type: 'gte'; field: string; value: unknown }
  | { type: 'ilike'; field: string; value: string }
  | { type: 'or'; field: string; value: string }

type OrderBy = {
  field: string
  ascending: boolean
}

const DB_STORAGE_KEY = 'crm-poligraf.local-db.v1'
const SESSION_STORAGE_KEY = 'crm-poligraf.local-session.v1'
const LOCAL_DB_VERSION = 3
const DB_API_URL = '/api/db'

const isBrowser = typeof window !== 'undefined'

/** True when the Vite dev-server file API was found on startup */
let serverModeActive = false

let memoryDb: LocalDatabaseState | null = null
let memorySession: LocalSession | null = null
let authListeners: Array<(event: string, session: LocalSession | null) => void> = []
let channels: Array<{
  name: string
  table: string | null
  callback: () => void
}> = []

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function nowIso() {
  return new Date().toISOString()
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function sessionFromAccount(account: LocalAuthAccount): LocalSession {
  return {
    access_token: `local_${account.id}`,
    user: {
      id: account.id,
      email: account.email,
    },
  }
}

function normalizeDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function createSeedData(): LocalDatabaseState {
  const baseDate = nowIso()

  const directorId = createId('profile')
  const financierId = createId('profile')
  const managerId = createId('profile')
  const designerId = createId('profile')

  const profiles: Profile[] = [
    { id: directorId, name: 'Director', role: 'director', login: 'director', is_active: true, created_at: baseDate },
    { id: financierId, name: 'Financier', role: 'financier', login: 'financier', is_active: true, created_at: baseDate },
    { id: managerId, name: 'Manager', role: 'manager', login: 'manager1', is_active: true, created_at: baseDate },
    { id: designerId, name: 'Designer', role: 'designer', login: 'designer1', is_active: true, created_at: baseDate },
  ]

  const auth_accounts: LocalAuthAccount[] = [
    { id: directorId, email: 'director@crm.internal', password: '123456' },
    { id: financierId, email: 'financier@crm.internal', password: '123456' },
    { id: managerId, email: 'manager1@crm.internal', password: '123456' },
    { id: designerId, email: 'designer1@crm.internal', password: '123456' },
  ]

  const categoryPrintId = createId('cat')
  const categoryOutdoorId = createId('cat')
  const subcatBusinessId = createId('subcat')
  const subcatBannerId = createId('subcat')

  const serviceCategories: ServiceCategory[] = [
    { id: categoryPrintId, name: 'Print', icon: 'P' },
    { id: categoryOutdoorId, name: 'Outdoor', icon: 'O' },
  ]

  const serviceSubcategories: ServiceSubcategory[] = [
    { id: subcatBusinessId, category_id: categoryPrintId, name: 'Business Cards' },
    { id: subcatBannerId, category_id: categoryOutdoorId, name: 'Banners' },
  ]

  const serviceBusinessCardsId = createId('service')
  const serviceBannerId = createId('service')

  const services: Service[] = [
    {
      id: serviceBusinessCardsId,
      subcategory_id: subcatBusinessId,
      name: 'Business cards 100 pcs',
      unit_of_measure: 'pcs',
      price_per_unit: 120000,
      is_archived: false,
      created_at: baseDate,
    },
    {
      id: serviceBannerId,
      subcategory_id: subcatBannerId,
      name: 'Banner 1 sqm',
      unit_of_measure: 'sqm',
      price_per_unit: 85000,
      is_archived: false,
      created_at: baseDate,
    },
  ]

  const clientReferralId = createId('client')
  const clientMainId = createId('client')
  const clientCompanyId = createId('client')

  const clients: Client[] = [
    {
      id: clientReferralId,
      name: 'Referral Partner',
      type: 'agent',
      phone: '+998900000001',
      telegram: '@referral',
      birthday: null,
      source: 'Referral',
      cashback_balance: 50000,
      cashback_percent: 7,
      referrer_id: null,
      is_archived: false,
      created_at: baseDate,
    },
    {
      id: clientMainId,
      name: 'Alice Brown',
      type: 'individual',
      phone: '+998900000002',
      telegram: '@alice',
      birthday: null,
      source: 'Instagram',
      cashback_balance: 25000,
      cashback_percent: 5,
      referrer_id: clientReferralId,
      is_archived: false,
      created_at: baseDate,
    },
    {
      id: clientCompanyId,
      name: 'Acme LLC',
      type: 'company',
      phone: '+998900000003',
      telegram: null,
      birthday: null,
      source: 'Website',
      cashback_balance: 0,
      cashback_percent: 3,
      referrer_id: null,
      is_archived: false,
      created_at: baseDate,
    },
  ]

  const orderOneId = createId('order')
  const orderTwoId = createId('order')

  const orders: Order[] = [
    {
      id: orderOneId,
      client_id: clientMainId,
      manager_id: managerId,
      title: 'Business cards order',
      description: 'Urgent print order',
      status: 'in_progress',
      priority: 'high',
      is_urgent: true,
      deadline: normalizeDate(new Date(Date.now() + 86400000 * 2)),
      total_amount: 240000,
      cost_price: 150000,
      referrer_cashback: 16800,
      cashback_applied: 0,
      cancel_reason: null,
      cancel_comment: null,
      order_number: 1001,
      created_at: baseDate,
      updated_at: baseDate,
    },
    {
      id: orderTwoId,
      client_id: clientCompanyId,
      manager_id: managerId,
      title: 'Outdoor banner',
      description: 'Front shop banner',
      status: 'ready',
      priority: 'medium',
      is_urgent: false,
      deadline: normalizeDate(new Date(Date.now() + 86400000 * 5)),
      total_amount: 850000,
      cost_price: 500000,
      referrer_cashback: 0,
      cashback_applied: 0,
      cancel_reason: null,
      cancel_comment: null,
      order_number: 1002,
      created_at: baseDate,
      updated_at: baseDate,
    },
  ]

  const orderItems: OrderItem[] = [
    {
      id: createId('item'),
      order_id: orderOneId,
      service_id: serviceBusinessCardsId,
      quantity: 2,
      price_per_unit: 120000,
      total_price: 240000,
      is_manual_price: false,
    },
    {
      id: createId('item'),
      order_id: orderTwoId,
      service_id: serviceBannerId,
      quantity: 10,
      price_per_unit: 85000,
      total_price: 850000,
      is_manual_price: false,
    },
  ]

  const payments: Payment[] = [
    {
      id: createId('payment'),
      order_id: orderOneId,
      amount: 100000,
      due_date: normalizeDate(new Date()),
      payment_type: 'cash',
      is_paid: true,
      paid_at: baseDate,
    },
    {
      id: createId('payment'),
      order_id: orderOneId,
      amount: 140000,
      due_date: normalizeDate(new Date(Date.now() + 86400000)),
      payment_type: 'transfer',
      is_paid: false,
      paid_at: null,
    },
    {
      id: createId('payment'),
      order_id: orderTwoId,
      amount: 850000,
      due_date: normalizeDate(new Date(Date.now() + 86400000 * 3)),
      payment_type: 'bank_transfer',
      is_paid: false,
      paid_at: null,
    },
  ]

  const orderTimeline: OrderTimelineEntry[] = [
    {
      id: createId('timeline'),
      order_id: orderOneId,
      user_id: managerId,
      event_type: 'created',
      description: 'Заказ создан менеджером Manager',
      created_at: baseDate,
    },
    {
      id: createId('timeline'),
      order_id: orderTwoId,
      user_id: managerId,
      event_type: 'created',
      description: 'Заказ создан менеджером Manager',
      created_at: baseDate,
    },
  ]

  const cashbackTransactions: CashbackTransaction[] = [
    {
      id: createId('cashback'),
      client_id: clientMainId,
      order_id: null,
      type: 'spent',
      amount: 10000,
      created_at: baseDate,
    },
  ]

  const notifications: NotificationRow[] = [
    {
      id: createId('notification'),
      user_id: directorId,
      type: 'system',
      order_id: orderTwoId,
      message: 'New order requires review',
      is_read: false,
      created_at: baseDate,
    },
  ]

  const cancelReasons: CancelReason[] = [
    { id: createId('reason'), reason: 'Client changed mind', is_active: true, created_at: baseDate },
    { id: createId('reason'), reason: 'Production issue', is_active: true, created_at: baseDate },
  ]

  const monthlyKpis: MonthlyKpi[] = [
    {
      id: createId('kpi'),
      user_id: managerId,
      month: '2026-05',
      role: 'manager',
      sales_plan: 50000000,
      orders_plan: 25,
      new_clients_plan: 10,
      tasks_plan: null,
      on_time_rate_plan: null,
      revision_limit_plan: null,
      created_at: baseDate,
      updated_at: baseDate,
    },
  ]

  const orderTickets: OrderTicket[] = [
    {
      id: createId('ticket'),
      order_id: orderOneId,
      title: 'Подготовить макет и согласовать печать визиток',
      description: 'Проверить текст, согласовать макет с клиентом и передать в печать.',
      status: 'in_progress',
      manager_assignee_id: managerId,
      designer_assignee_id: designerId,
      deadline: normalizeDate(new Date(Date.now() + 86400000)),
      created_by: directorId,
      created_at: baseDate,
      updated_at: baseDate,
    },
  ]

  return {
    profiles,
    clients,
    service_categories: serviceCategories,
    service_subcategories: serviceSubcategories,
    services,
    orders,
    order_items: orderItems,
    payments,
    order_timeline: orderTimeline,
    cashback_transactions: cashbackTransactions,
    notifications,
    cancel_reasons: cancelReasons,
    monthly_kpis: monthlyKpis,
    order_tickets: orderTickets,
    auth_accounts,
  }
}

function containsMojibake(value: string | null | undefined) {
  return Boolean(value && /Р|вЂ|Ѓ|Ў|Ђ|СЂСџ/.test(value))
}

function normalizeDemoDatabase(db: LocalDatabaseState) {
  let changed = false
  const orderTickets = Array.isArray((db as Partial<LocalDatabaseState>).order_tickets)
    ? db.order_tickets
    : []

  const renameProfile = (login: string, nextName: string) => {
    const profile = db.profiles.find((item) => item.login === login)
    if (profile && profile.name !== nextName) {
      profile.name = nextName
      changed = true
    }
  }

  renameProfile('director', 'Директор')
  renameProfile('financier', 'Финансист')
  renameProfile('manager1', 'Менеджер')
  renameProfile('designer1', 'Дизайнер')

  const categoryNames: Record<string, { name: string; icon: string | null }> = {
    Print: { name: 'Полиграфия', icon: 'П' },
    Outdoor: { name: 'Наружная реклама', icon: 'Н' },
  }

  for (const category of db.service_categories) {
    const normalized = categoryNames[category.name]
    if (normalized) {
      if (category.name !== normalized.name || category.icon !== normalized.icon) {
        category.name = normalized.name
        category.icon = normalized.icon
        changed = true
      }
      continue
    }

    if (category.icon && containsMojibake(category.icon)) {
      category.icon = null
      changed = true
    }
  }

  const subcategoryNames: Record<string, string> = {
    'Business Cards': 'Визитки',
    Banners: 'Баннеры',
  }

  for (const subcategory of db.service_subcategories) {
    const normalized = subcategoryNames[subcategory.name]
    if (normalized && subcategory.name !== normalized) {
      subcategory.name = normalized
      changed = true
    }
  }

  const serviceNames: Record<string, { name: string; unit: string }> = {
    'Business cards 100 pcs': { name: 'Визитки 100 шт.', unit: 'шт' },
    'Banner 1 sqm': { name: 'Баннер 1 кв.м', unit: 'кв.м' },
  }

  for (const service of db.services) {
    const normalized = serviceNames[service.name]
    if (normalized && (service.name !== normalized.name || service.unit_of_measure !== normalized.unit)) {
      service.name = normalized.name
      service.unit_of_measure = normalized.unit
      changed = true
    }
  }

  const clientNames: Record<string, Partial<Client>> = {
    'Referral Partner': { name: 'Реферальный партнёр', telegram: '@partner', source: 'Реферал' },
    'Alice Brown': { name: 'Алина Каримова', telegram: '@alina' },
    'Acme LLC': { name: 'ООО Grand Print', source: 'Сайт' },
  }

  for (const client of db.clients) {
    const normalized = clientNames[client.name]
    if (!normalized) continue

    if (client.name !== normalized.name || client.telegram !== normalized.telegram || client.source !== normalized.source) {
      Object.assign(client, normalized)
      changed = true
    }
  }

  const orderNames: Record<string, Partial<Order>> = {
    'Business cards order': {
      title: 'Печать визиток',
      description: 'Срочный заказ на печать визиток',
    },
    'Outdoor banner': {
      title: 'Наружный баннер',
      description: 'Баннер для фасада магазина',
    },
  }

  for (const order of db.orders) {
    const normalized = orderNames[order.title]
    if (!normalized) continue

    if (order.title !== normalized.title || order.description !== normalized.description) {
      Object.assign(order, normalized)
      changed = true
    }
  }

  for (const notification of db.notifications) {
    if (notification.message === 'New order requires review') {
      notification.message = 'Новый заказ ожидает проверки'
      changed = true
    }
  }

  for (const ticket of orderTickets) {
    if (ticket.title === 'Prepare layout and approve business card print') {
      ticket.title = 'Подготовить макет и согласовать печать визиток'
      changed = true
    }

    if (ticket.description === 'Check the text, approve the layout with the client, and send it to print.') {
      ticket.description = 'Проверить текст, согласовать макет с клиентом и передать в печать.'
      changed = true
    }
  }

  for (const reason of db.cancel_reasons) {
    if (reason.reason === 'Client changed mind') {
      reason.reason = 'Клиент передумал'
      changed = true
    }
    if (reason.reason === 'Production issue') {
      reason.reason = 'Производственная ошибка'
      changed = true
    }
  }

  return changed
}

function migrateLegacyDatabase(db: LocalDatabaseState) {
  let changed = normalizeDemoDatabase(db)

  if (!Array.isArray((db as Partial<LocalDatabaseState>).monthly_kpis)) {
    db.monthly_kpis = []
    changed = true
  }

  if (!Array.isArray((db as Partial<LocalDatabaseState>).order_tickets)) {
    db.order_tickets = []
    changed = true
  }

  const hasDesignerProfile = db.profiles.some((profile) => profile.login === 'designer1')
  if (!hasDesignerProfile) {
    const createdAt = nowIso()
    const designerId = createId('profile')
    db.profiles.push({
      id: designerId,
      name: 'Дизайнер',
      role: 'designer',
      login: 'designer1',
      is_active: true,
      created_at: createdAt,
    })
    db.auth_accounts.push({
      id: designerId,
      email: 'designer1@crm.internal',
      password: '123456',
    })
    changed = true
  } else {
    const designerProfile = db.profiles.find((profile) => profile.login === 'designer1')
    if (designerProfile && designerProfile.role !== 'designer') {
      designerProfile.role = 'designer'
      changed = true
    }

    const hasDesignerAccount = db.auth_accounts.some((account) => account.email === 'designer1@crm.internal')
    if (designerProfile && !hasDesignerAccount) {
      db.auth_accounts.push({
        id: designerProfile.id,
        email: 'designer1@crm.internal',
        password: '123456',
      })
      changed = true
    }
  }

  const profilesById = new Map(db.profiles.map((profile) => [profile.id, profile]))
  const servicesById = new Map(db.services.map((service) => [service.id, service]))

  for (const timelineEntry of db.order_timeline) {
    const userName = profilesById.get(timelineEntry.user_id)?.name ?? 'Система'

    if (
      timelineEntry.event_type === 'created' &&
      (containsMojibake(timelineEntry.description) || timelineEntry.description?.startsWith('Order created by manager'))
    ) {
      timelineEntry.description = `Заказ создан менеджером ${userName}`
      changed = true
    }

    if (timelineEntry.event_type === 'payment' && containsMojibake(timelineEntry.description)) {
      timelineEntry.description = 'Отмечена оплата'
      changed = true
    }

    if (timelineEntry.event_type === 'comment' && containsMojibake(timelineEntry.description)) {
      timelineEntry.description = `Заказ обновлен менеджером ${userName}`
      changed = true
    }
  }

  for (const orderItem of db.order_items) {
    const service = orderItem.service_id ? servicesById.get(orderItem.service_id) : null
    const servicePrice = service?.price_per_unit ?? null

    if (servicePrice && orderItem.price_per_unit && servicePrice / Math.max(orderItem.price_per_unit, 1) >= 100) {
      orderItem.price_per_unit = servicePrice
      changed = true
    }

    const quantity = orderItem.quantity ?? 0
    const effectivePrice = orderItem.price_per_unit ?? servicePrice ?? 0
    const expectedTotal = quantity > 0 && effectivePrice > 0 ? quantity * effectivePrice : 0

    if (expectedTotal > 0 && expectedTotal / Math.max(orderItem.total_price, 1) >= 100) {
      orderItem.total_price = expectedTotal
      changed = true
    }
  }

  for (const category of db.service_categories) {
    if (category.icon && containsMojibake(category.icon)) {
      category.icon = null
      changed = true
    }
  }

  return changed
}

function loadDatabase(): LocalDatabaseState {
  if (memoryDb) {
    return memoryDb
  }

  if (!isBrowser) {
    memoryDb = createSeedData()
    return memoryDb
  }

  const raw = window.localStorage.getItem(DB_STORAGE_KEY)
  if (!raw) {
    memoryDb = createSeedData()
    migrateLegacyDatabase(memoryDb)
    saveDatabaseToStorage(memoryDb)
    return memoryDb
  }

  memoryDb = JSON.parse(raw) as LocalDatabaseState
  if (migrateLegacyDatabase(memoryDb)) {
    saveDatabaseToStorage(memoryDb)
  }
  return memoryDb
}

function saveDatabaseToStorage(nextDb: LocalDatabaseState) {
  if (isBrowser) {
    window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(nextDb))
  }
  if (serverModeActive) {
    // fire-and-forget: persist to data/db.json via Vite plugin API
    fetch(DB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextDb),
    }).catch(() => { /* ignore network errors */ })
  }
}

function saveDatabase(nextDb: LocalDatabaseState) {
  memoryDb = nextDb
  saveDatabaseToStorage(nextDb)
}

function loadSession(): LocalSession | null {
  if (memorySession !== null) {
    return memorySession
  }

  if (!isBrowser) {
    return null
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
  memorySession = raw ? (JSON.parse(raw) as LocalSession) : null
  return memorySession
}

function saveSession(session: LocalSession | null) {
  memorySession = session
  if (!isBrowser) {
    return
  }

  if (session) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

function validateImportedDatabase(value: unknown): value is LocalDatabaseState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<LocalDatabaseState>

  return Boolean(
    Array.isArray(candidate.profiles) &&
    Array.isArray(candidate.clients) &&
    Array.isArray(candidate.service_categories) &&
    Array.isArray(candidate.service_subcategories) &&
    Array.isArray(candidate.services) &&
    Array.isArray(candidate.orders) &&
    Array.isArray(candidate.order_items) &&
    Array.isArray(candidate.payments) &&
    Array.isArray(candidate.order_timeline) &&
    Array.isArray(candidate.cashback_transactions) &&
    Array.isArray(candidate.notifications) &&
    Array.isArray(candidate.cancel_reasons) &&
    Array.isArray(candidate.monthly_kpis ?? []) &&
    Array.isArray(candidate.order_tickets ?? []) &&
    Array.isArray(candidate.auth_accounts)
  )
}

function emitAuth(event: string, session: LocalSession | null) {
  for (const listener of authListeners) {
    listener(event, session)
  }
}

function emitTableChange(table: string) {
  for (const channel of channels) {
    if (!channel.table || channel.table === table) {
      channel.callback()
    }
  }
}

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: Filter[]) {
  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.type === 'or') {
        return filter.value.split(',').some((part) => {
          const match = part.match(/^([^.]*)\.ilike\.(.*)$/)
          if (!match) return false
          const [, field, pattern] = match
          const needle = pattern.replaceAll('%', '').toLowerCase()
          return String(row[field as keyof T] ?? '').toLowerCase().includes(needle)
        })
      }

      const value = row[filter.field as keyof T]

      if (filter.type === 'eq') {
        return value === filter.value
      }

      if (filter.type === 'in') {
        return filter.value.includes(value)
      }

      if (filter.type === 'gte') {
        return String(value ?? '') >= String(filter.value ?? '')
      }

      if (filter.type === 'ilike') {
        const needle = filter.value.replaceAll('%', '').toLowerCase()
        return String(value ?? '').toLowerCase().includes(needle)
      }

      return true
    })
  )
}

function applyOrdering<T extends Record<string, unknown>>(rows: T[], orderBy: OrderBy[]) {
  if (!orderBy.length) {
    return rows
  }

  return [...rows].sort((left, right) => {
    for (const item of orderBy) {
      const a = left[item.field as keyof T]
      const b = right[item.field as keyof T]
      if (a === b) continue
      const comparison = String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true })
      return item.ascending ? comparison : -comparison
    }
    return 0
  })
}

function buildClient(client: Client, db: LocalDatabaseState) {
  const referrer = client.referrer_id ? db.clients.find((item) => item.id === client.referrer_id) : null

  return {
    ...clone(client),
    referrer: referrer
      ? {
          id: referrer.id,
          name: referrer.name,
          cashback_percent: referrer.cashback_percent,
          cashback_balance: referrer.cashback_balance,
        }
      : null,
  }
}

function buildService(service: Service, db: LocalDatabaseState) {
  const subcategory = db.service_subcategories.find((item) => item.id === service.subcategory_id)
  const category = subcategory
    ? db.service_categories.find((item) => item.id === subcategory.category_id)
    : null

  return {
    ...clone(service),
    subcategory: subcategory
      ? {
          ...clone(subcategory),
          category: category ? clone(category) : null,
        }
      : null,
  }
}

function buildOrderItem(item: OrderItem, db: LocalDatabaseState) {
  const service = item.service_id ? db.services.find((entry) => entry.id === item.service_id) : null

  return {
    ...clone(item),
    service: service ? buildService(service, db) : null,
  }
}

function buildTimelineEntry(entry: OrderTimelineEntry, db: LocalDatabaseState) {
  const user = db.profiles.find((profile) => profile.id === entry.user_id)

  return {
    ...clone(entry),
    user: user ? { id: user.id, name: user.name } : null,
  }
}

function buildOrderSummary(order: Order, db: LocalDatabaseState) {
  const client = db.clients.find((item) => item.id === order.client_id)
  const manager = db.profiles.find((item) => item.id === order.manager_id)

  return {
    ...clone(order),
    client: client ? buildClient(client, db) : null,
    manager: manager ? { id: manager.id, name: manager.name } : null,
  }
}

function buildOrderTicket(ticket: OrderTicket, db: LocalDatabaseState) {
  const order = db.orders.find((item) => item.id === ticket.order_id)
  const managerAssignee = db.profiles.find((item) => item.id === ticket.manager_assignee_id)
  const designerAssignee = db.profiles.find((item) => item.id === ticket.designer_assignee_id)
  const createdByUser = db.profiles.find((item) => item.id === ticket.created_by)

  return {
    ...clone(ticket),
    order: order ? buildOrderSummary(order, db) : null,
    manager_assignee: managerAssignee ? { id: managerAssignee.id, name: managerAssignee.name } : null,
    designer_assignee: designerAssignee ? { id: designerAssignee.id, name: designerAssignee.name } : null,
    created_by_user: createdByUser ? { id: createdByUser.id, name: createdByUser.name } : null,
  }
}

function buildOrder(order: Order, db: LocalDatabaseState) {
  const ticket = db.order_tickets.find((item) => item.order_id === order.id)

  return {
    ...buildOrderSummary(order, db),
    order_items: db.order_items.filter((item) => item.order_id === order.id).map((item) => buildOrderItem(item, db)),
    payments: db.payments.filter((payment) => payment.order_id === order.id).map((payment) => clone(payment)),
    order_timeline: db.order_timeline.filter((entry) => entry.order_id === order.id).map((entry) => buildTimelineEntry(entry, db)),
    order_ticket: ticket ? buildOrderTicket(ticket, db) : null,
  }
}

function buildCashbackTransaction(transaction: CashbackTransaction, db: LocalDatabaseState) {
  const order = transaction.order_id ? db.orders.find((item) => item.id === transaction.order_id) : null
  return {
    ...clone(transaction),
    order: order ? buildOrder(order, db) : null,
  }
}

function materializeRows(table: TableName, rows: Array<Record<string, unknown>>, db: LocalDatabaseState) {
  switch (table) {
    case 'clients':
      return (rows as unknown as Client[]).map((row) => buildClient(row, db))
    case 'orders':
      return (rows as unknown as Order[]).map((row) => buildOrder(row, db))
    case 'order_items':
      return (rows as unknown as OrderItem[]).map((row) => buildOrderItem(row, db))
    case 'order_timeline':
      return (rows as unknown as OrderTimelineEntry[]).map((row) => buildTimelineEntry(row, db))
    case 'cashback_transactions':
      return (rows as unknown as CashbackTransaction[]).map((row) => buildCashbackTransaction(row, db))
    case 'monthly_kpis':
      return clone(rows)
    case 'order_tickets':
      return (rows as unknown as OrderTicket[]).map((row) => buildOrderTicket(row, db))
    default:
      return clone(rows)
  }
}

function nextOrderNumber(db: LocalDatabaseState) {
  return db.orders.reduce((max, order) => Math.max(max, order.order_number), 1000) + 1
}

function createRow(table: TableName, payload: Record<string, unknown>, db: LocalDatabaseState) {
  const created_at = nowIso()

  switch (table) {
    case 'profiles': {
      const profilePayload = payload as LocalInsertMap['profiles']
      return {
        id: createId('profile'),
        name: profilePayload.name,
        role: profilePayload.role,
        login: profilePayload.login ?? null,
        is_active: profilePayload.is_active ?? true,
        created_at,
      }
    }
    case 'clients': {
      const clientPayload = payload as LocalInsertMap['clients']
      return {
        id: createId('client'),
        name: clientPayload.name,
        type: clientPayload.type,
        phone: clientPayload.phone ?? null,
        telegram: clientPayload.telegram ?? null,
        birthday: clientPayload.birthday ?? null,
        source: clientPayload.source ?? null,
        cashback_balance: clientPayload.cashback_balance ?? 0,
        cashback_percent: clientPayload.cashback_percent ?? 5,
        referrer_id: clientPayload.referrer_id ?? null,
        is_archived: clientPayload.is_archived ?? false,
        created_at,
      }
    }
    case 'service_categories': {
      const categoryPayload = payload as LocalInsertMap['service_categories']
      return {
        id: createId('cat'),
        name: categoryPayload.name,
        icon: categoryPayload.icon ?? null,
      }
    }
    case 'service_subcategories': {
      const subcategoryPayload = payload as LocalInsertMap['service_subcategories']
      return {
        id: createId('subcat'),
        category_id: subcategoryPayload.category_id,
        name: subcategoryPayload.name,
      }
    }
    case 'services': {
      const servicePayload = payload as LocalInsertMap['services']
      return {
        id: createId('service'),
        subcategory_id: servicePayload.subcategory_id,
        name: servicePayload.name,
        unit_of_measure: servicePayload.unit_of_measure,
        price_per_unit: servicePayload.price_per_unit,
        is_archived: servicePayload.is_archived ?? false,
        created_at,
      }
    }
    case 'orders': {
      const orderPayload = payload as LocalInsertMap['orders']
      return {
        id: createId('order'),
        client_id: orderPayload.client_id,
        manager_id: orderPayload.manager_id,
        title: orderPayload.title,
        description: orderPayload.description ?? null,
        status: orderPayload.status ?? 'new',
        priority: (orderPayload.priority ?? 'medium') as OrderPriority,
        is_urgent: orderPayload.is_urgent ?? false,
        deadline: orderPayload.deadline ?? null,
        total_amount: orderPayload.total_amount ?? 0,
        cost_price: orderPayload.cost_price ?? 0,
        referrer_cashback: orderPayload.referrer_cashback ?? 0,
        cashback_applied: orderPayload.cashback_applied ?? 0,
        cancel_reason: orderPayload.cancel_reason ?? null,
        cancel_comment: orderPayload.cancel_comment ?? null,
        order_number: orderPayload.order_number ?? nextOrderNumber(db),
        created_at,
        updated_at: created_at,
      }
    }
    case 'order_items': {
      const itemPayload = payload as LocalInsertMap['order_items']
      return {
        id: createId('item'),
        order_id: itemPayload.order_id,
        service_id: itemPayload.service_id ?? null,
        quantity: itemPayload.quantity ?? null,
        price_per_unit: itemPayload.price_per_unit ?? null,
        total_price: itemPayload.total_price,
        is_manual_price: itemPayload.is_manual_price ?? false,
      }
    }
    case 'payments': {
      const paymentPayload = payload as LocalInsertMap['payments']
      return {
        id: createId('payment'),
        order_id: paymentPayload.order_id,
        amount: paymentPayload.amount,
        due_date: paymentPayload.due_date ?? null,
        payment_type: paymentPayload.payment_type ?? null,
        is_paid: paymentPayload.is_paid ?? false,
        paid_at: paymentPayload.paid_at ?? null,
      }
    }
    case 'order_timeline': {
      const timelinePayload = payload as LocalInsertMap['order_timeline']
      return {
        id: createId('timeline'),
        order_id: timelinePayload.order_id,
        user_id: timelinePayload.user_id,
        event_type: timelinePayload.event_type,
        description: timelinePayload.description ?? null,
        created_at,
      }
    }
    case 'cashback_transactions': {
      const cashbackPayload = payload as LocalInsertMap['cashback_transactions']
      return {
        id: createId('cashback'),
        client_id: cashbackPayload.client_id,
        order_id: cashbackPayload.order_id ?? null,
        type: cashbackPayload.type,
        amount: cashbackPayload.amount,
        created_at,
      }
    }
    case 'notifications': {
      const notificationPayload = payload as LocalInsertMap['notifications']
      return {
        id: createId('notification'),
        user_id: notificationPayload.user_id,
        type: notificationPayload.type,
        order_id: notificationPayload.order_id ?? null,
        message: notificationPayload.message,
        is_read: notificationPayload.is_read ?? false,
        created_at,
      }
    }
    case 'cancel_reasons': {
      const reasonPayload = payload as LocalInsertMap['cancel_reasons']
      return {
        id: createId('reason'),
        reason: reasonPayload.reason,
        is_active: reasonPayload.is_active ?? true,
        created_at,
      }
    }
    case 'monthly_kpis': {
      const kpiPayload = payload as LocalInsertMap['monthly_kpis']
      return {
        id: createId('kpi'),
        user_id: kpiPayload.user_id,
        month: kpiPayload.month,
        role: kpiPayload.role,
        sales_plan: kpiPayload.sales_plan ?? null,
        orders_plan: kpiPayload.orders_plan ?? null,
        new_clients_plan: kpiPayload.new_clients_plan ?? null,
        tasks_plan: kpiPayload.tasks_plan ?? null,
        on_time_rate_plan: kpiPayload.on_time_rate_plan ?? null,
        revision_limit_plan: kpiPayload.revision_limit_plan ?? null,
        created_at,
        updated_at: created_at,
      }
    }
    case 'order_tickets': {
      const ticketPayload = payload as LocalInsertMap['order_tickets']
      return {
        id: createId('ticket'),
        order_id: ticketPayload.order_id,
        title: ticketPayload.title,
        description: ticketPayload.description ?? null,
        status: ticketPayload.status ?? 'new',
        manager_assignee_id: ticketPayload.manager_assignee_id,
        designer_assignee_id: ticketPayload.designer_assignee_id,
        deadline: ticketPayload.deadline ?? null,
        created_by: ticketPayload.created_by,
        created_at,
        updated_at: created_at,
      }
    }
    default:
      throw new Error(`Unsupported table: ${String(table)}`)
  }
}

class LocalQueryBuilder<K extends TableName> implements PromiseLike<QueryResult<unknown>> {
  private mode: 'select' | 'insert' | 'update' = 'select'
  private filters: Filter[] = []
  private orderBy: OrderBy[] = []
  private limitCount: number | null = null
  private payload: LocalInsertMap[K] | Array<LocalInsertMap[K]> | LocalUpdateMap[K] | null = null
  private table: K

  constructor(table: K) {
    this.table = table
  }

  select(_columns = '*') {
    void _columns
    return this
  }

  insert(values: LocalInsertMap[K] | Array<LocalInsertMap[K]>) {
    this.mode = 'insert'
    this.payload = values
    return this
  }

  update(values: LocalUpdateMap[K]) {
    this.mode = 'update'
    this.payload = values
    return this
  }

  eq(field: string, value: unknown) {
    this.filters.push({ type: 'eq', field, value })
    return this
  }

  in(field: string, value: unknown[]) {
    this.filters.push({ type: 'in', field, value })
    return this
  }

  gte(field: string, value: unknown) {
    this.filters.push({ type: 'gte', field, value })
    return this
  }

  ilike(field: string, value: string) {
    this.filters.push({ type: 'ilike', field, value })
    return this
  }

  or(value: string) {
    this.filters.push({ type: 'or', field: '', value })
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderBy.push({ field, ascending: options?.ascending ?? true })
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  async single() {
    const result = await this.execute()
    const data = Array.isArray(result.data) ? result.data[0] ?? null : result.data
    return {
      data,
      error: data ? null : result.error ?? { message: 'Not found' },
    }
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute(): Promise<QueryResult<unknown>> {
    try {
      const db = loadDatabase()

      if (this.mode === 'select') {
        const baseRows = clone(db[this.table]) as unknown as Array<Record<string, unknown>>
        let rows = applyFilters(baseRows, this.filters)
        rows = applyOrdering(rows, this.orderBy)
        if (this.limitCount !== null) {
          rows = rows.slice(0, this.limitCount)
        }
        return {
          data: materializeRows(this.table, rows, db),
          error: null,
        }
      }

      if (this.mode === 'insert') {
        const payloads = Array.isArray(this.payload) ? this.payload : [this.payload as LocalInsertMap[K]]
        const nextDb = clone(db)
        const inserted = payloads.map((payload) => createRow(this.table, payload as unknown as Record<string, unknown>, nextDb))
        ;(nextDb[this.table] as Array<LocalDatabaseState[K][number]>).push(...inserted)
        saveDatabase(nextDb)
        emitTableChange(this.table)
        return {
          data: materializeRows(this.table, inserted as unknown as Array<Record<string, unknown>>, nextDb),
          error: null,
        }
      }

      const nextDb = clone(db)
      const rows = nextDb[this.table] as unknown as Array<Record<string, unknown>>
      const filteredRows = applyFilters(rows, this.filters)
      for (const row of filteredRows) {
        Object.assign(row, this.payload)
      }
      saveDatabase(nextDb)
      emitTableChange(this.table)
      return {
        data: materializeRows(this.table, filteredRows, nextDb),
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown local database error' },
      }
    }
  }
}

const auth = {
  async getSession() {
    return {
      data: {
        session: loadSession(),
      },
    }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const db = loadDatabase()
    const account = db.auth_accounts.find((item) => item.email === email && item.password === password)
    if (!account) {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      }
    }

    const session = sessionFromAccount(account)
    saveSession(session)
    emitAuth('SIGNED_IN', session)

    return {
      data: {
        user: session.user,
        session,
      },
      error: null,
    }
  },

  async signOut() {
    saveSession(null)
    emitAuth('SIGNED_OUT', null)
    return { error: null }
  },

  onAuthStateChange(callback: (event: string, session: LocalSession | null) => void) {
    authListeners.push(callback)
    return {
      data: {
        subscription: {
          unsubscribe() {
            authListeners = authListeners.filter((listener) => listener !== callback)
          },
        },
      },
    }
  },
}

export async function createLocalUser(input: {
  name: string
  login: string
  password: string
  role: UserRole
}) {
  const db = loadDatabase()
  const normalizedLogin = input.login.trim().toLowerCase()

  if (input.password.length < 6) {
    return { data: null, error: 'password_too_short' }
  }

  if (db.profiles.some((profile) => profile.login?.toLowerCase() === normalizedLogin)) {
    return { data: null, error: 'login_exists' }
  }

  const nextDb = clone(db)
  const profile = createRow('profiles', {
    name: input.name.trim(),
    login: normalizedLogin,
    role: input.role,
    is_active: true,
  }, nextDb) as Profile

  nextDb.profiles.push(profile)
  nextDb.auth_accounts.push({
    id: profile.id,
    email: `${normalizedLogin}@crm.internal`,
    password: input.password,
  })

  saveDatabase(nextDb)
  emitTableChange('profiles')

  return { data: profile, error: null }
}

export async function updateLocalUser(input: {
  userId: string
  name?: string
  role?: UserRole
  password?: string
  is_active?: boolean
}) {
  const db = loadDatabase()
  const nextDb = clone(db)
  const profile = nextDb.profiles.find((item) => item.id === input.userId)

  if (!profile) {
    return { data: null, error: 'user_not_found' }
  }

  if (input.password && input.password.length < 6) {
    return { data: null, error: 'password_too_short' }
  }

  if (typeof input.name === 'string') {
    profile.name = input.name.trim()
  }
  if (input.role) {
    profile.role = input.role
  }
  if (typeof input.is_active === 'boolean') {
    profile.is_active = input.is_active
  }

  if (input.password) {
    const account = nextDb.auth_accounts.find((item) => item.id === profile.id)
    if (account) {
      account.password = input.password
    }
  }

  saveDatabase(nextDb)
  emitTableChange('profiles')

  const session = loadSession()
  if (session?.user.id === profile.id && input.is_active === false) {
    saveSession(null)
    emitAuth('SIGNED_OUT', null)
  }

  return { data: profile, error: null }
}

export async function upsertMonthlyKpi(input: MonthlyKpiInput) {
  const validation = validateMonthlyKpiInput(input)
  if (!validation.valid) {
    return { data: null, error: validation.error }
  }

  const db = loadDatabase()
  const nextDb = clone(db)
  const payload = sanitizeMonthlyKpiPayload(input)
  const existing = nextDb.monthly_kpis.find(
    (item) => item.user_id === payload.user_id && item.month === payload.month,
  )

  if (existing) {
    Object.assign(existing, payload, { updated_at: nowIso() })
    saveDatabase(nextDb)
    emitTableChange('monthly_kpis')
    return { data: existing, error: null }
  }

  const created = createRow('monthly_kpis', payload, nextDb) as MonthlyKpi
  nextDb.monthly_kpis.push(created)
  saveDatabase(nextDb)
  emitTableChange('monthly_kpis')
  return { data: created, error: null }
}

export async function getUserMonthlyKpis(userId: string) {
  return localDb
    .from('monthly_kpis')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: false })
}

export async function getOrderTickets() {
  return localDb
    .from('order_tickets')
    .select('*')
    .order('updated_at', { ascending: false })
}

export async function getOrderTicketByOrderId(orderId: string) {
  return localDb
    .from('order_tickets')
    .select('*')
    .eq('order_id', orderId)
    .single()
}

export async function createOrderTicket(input: Omit<OrderTicket, 'id' | 'created_at' | 'updated_at'>) {
  const db = loadDatabase()
  const managerProfile = db.profiles.find((item) => item.id === input.manager_assignee_id)
  const designerProfile = db.profiles.find((item) => item.id === input.designer_assignee_id)
  const validation = validateOrderTicketInput({
    order_id: input.order_id,
    title: input.title,
    status: input.status,
    manager_assignee_role: managerProfile?.role,
    designer_assignee_role: designerProfile?.role,
  })

  if (!validation.valid) {
    return { data: null, error: validation.error }
  }

  if (db.order_tickets.some((item) => item.order_id === input.order_id)) {
    return { data: null, error: 'ticket_exists_for_order' as const }
  }

  const created = createRow('order_tickets', input, db) as OrderTicket
  const nextDb = clone(db)
  nextDb.order_tickets.push(created)
  saveDatabase(nextDb)
  emitTableChange('order_tickets')
  emitTableChange('orders')

  return { data: buildOrderTicket(created, nextDb), error: null }
}

export async function updateOrderTicket(
  ticketId: string,
  patch: Partial<Omit<OrderTicket, 'id' | 'order_id' | 'created_at' | 'created_by'>>,
) {
  const db = loadDatabase()
  const nextDb = clone(db)
  const ticket = nextDb.order_tickets.find((item) => item.id === ticketId)

  if (!ticket) {
    return { data: null, error: 'ticket_not_found' as const }
  }

  const managerProfile = nextDb.profiles.find((item) => item.id === (patch.manager_assignee_id ?? ticket.manager_assignee_id))
  const designerProfile = nextDb.profiles.find((item) => item.id === (patch.designer_assignee_id ?? ticket.designer_assignee_id))
  const validation = validateOrderTicketInput({
    order_id: ticket.order_id,
    title: patch.title ?? ticket.title,
    status: patch.status ?? ticket.status,
    manager_assignee_role: managerProfile?.role,
    designer_assignee_role: designerProfile?.role,
  })

  if (!validation.valid) {
    return { data: null, error: validation.error }
  }

  Object.assign(ticket, patch, { updated_at: nowIso() })
  saveDatabase(nextDb)
  emitTableChange('order_tickets')
  emitTableChange('orders')

  return { data: buildOrderTicket(ticket, nextDb), error: null }
}

export function getLocalDatabaseSnapshot() {
  const db = clone(loadDatabase())
  migrateLegacyDatabase(db)

  return {
    version: LOCAL_DB_VERSION,
    exported_at: nowIso(),
    data: db,
  }
}

export function resetLocalDemoData() {
  const nextDb = createSeedData()
  migrateLegacyDatabase(nextDb)
  saveDatabase(nextDb)
  saveSession(null)
  emitAuth('SIGNED_OUT', null)

  const tables: TableName[] = [
    'profiles',
    'clients',
    'service_categories',
    'service_subcategories',
    'services',
    'orders',
    'order_items',
    'payments',
    'order_timeline',
    'cashback_transactions',
    'notifications',
    'cancel_reasons',
    'monthly_kpis',
    'order_tickets',
  ]

  for (const table of tables) {
    emitTableChange(table)
  }
}

export function importLocalDatabaseSnapshot(raw: string) {
  const parsed = JSON.parse(raw) as { data?: unknown }
  const payload = parsed?.data ?? parsed

  if (!validateImportedDatabase(payload)) {
    throw new Error('Invalid local database snapshot')
  }

  const nextDb = clone(payload)
  migrateLegacyDatabase(nextDb)
  saveDatabase(nextDb)
  saveSession(null)
  emitAuth('SIGNED_OUT', null)

  const tables: TableName[] = [
    'profiles',
    'clients',
    'service_categories',
    'service_subcategories',
    'services',
    'orders',
    'order_items',
    'payments',
    'order_timeline',
    'cashback_transactions',
    'notifications',
    'cancel_reasons',
    'monthly_kpis',
    'order_tickets',
  ]

  for (const table of tables) {
    emitTableChange(table)
  }
}

const localDb = {
  auth,
  from<K extends TableName>(table: K) {
    return new LocalQueryBuilder(table)
  },
  channel(name: string) {
    const channel = {
      name,
      table: null as string | null,
      callback: () => {},
      on(_event: string, filter: Record<string, unknown>, callback: () => void) {
        channel.table = typeof filter.table === 'string' ? filter.table : null
        channel.callback = callback
        return channel
      },
      subscribe() {
        channels.push(channel)
        return channel
      },
    }

    return channel
  },
  async removeChannel(channel: { name: string }) {
    channels = channels.filter((item) => item.name !== channel.name)
    return { error: null }
  },
}

/**
 * Call once before mounting React.
 * Tries to load the database from the Vite dev-server file API (data/db.json).
 * If the API is available, server mode is activated and every subsequent save
 * also writes back to the file so all devices on the same network share data.
 * Falls back to localStorage transparently when the API is not reachable.
 */
export async function initializeDatabase(): Promise<void> {
  if (!isBrowser) return

  try {
    const response = await fetch(DB_API_URL, { method: 'GET' })
    if (!response.ok) throw new Error('API not available')

    const json: unknown = await response.json()

    if (json !== null && typeof json === 'object') {
      const payload = json as LocalDatabaseState
      memoryDb = payload
      migrateLegacyDatabase(memoryDb)
      serverModeActive = true
      // mirror to localStorage so offline fallback stays current
      window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(memoryDb))
      return
    }

    // API returned null → no db.json yet; initialise from localStorage seed
    serverModeActive = true
    const db = loadDatabase() // creates seed data + writes localStorage
    // persist to file
    await fetch(DB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db),
    }).catch(() => { /* ignore */ })
  } catch {
    // Vite API not reachable (production build, or API not wired up) → use localStorage
    serverModeActive = false
    loadDatabase()
  }
}

export { localDb }

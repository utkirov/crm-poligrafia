# Order Tickets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one production ticket per order with shared workflow for `manager` and `designer`, including role-based visibility, order integration, ticket list/detail pages, and local persistence.

**Architecture:** Extend the local-first CRM with a separate `order_tickets` entity rather than embedding ticket fields directly into `orders`. Tickets are created only from order detail, enforce one-ticket-per-order, expose a role-filtered ticket list and detail page, and share a single status lifecycle `new -> in_progress -> done`.

**Tech Stack:** React 19, TypeScript, React Router 7, Zustand, localStorage-backed local DB, Vitest, Playwright.

---

## File Structure

### Existing files to modify

- `D:\utkirov\work\2026\AI\new-crm-polig\src\types\database.ts`
  - add `OrderTicketStatus`
  - add `OrderTicket`
  - add `order_tickets` table
- `D:\utkirov\work\2026\AI\new-crm-polig\src\types\extended.ts`
  - add ticket-derived detail/list types
- `D:\utkirov\work\2026\AI\new-crm-polig\src\types\kpi.ts`
  - no change expected unless shared role helpers are needed
- `D:\utkirov\work\2026\AI\new-crm-polig\src\types\index.ts`
  - re-export any new ticket types if needed
- `D:\utkirov\work\2026\AI\new-crm-polig\src\lib\localDb.ts`
  - add `order_tickets` storage, seed, migration, validation, CRUD helpers
- `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrder.ts`
  - include ticket in order detail load and manager visibility rules
- `D:\utkirov\work\2026\AI\new-crm-polig\src\layouts\Sidebar.tsx`
  - add tickets nav for `director`, `manager`, `designer`
- `D:\utkirov\work\2026\AI\new-crm-polig\src\App.tsx`
  - add `/tickets` and `/tickets/:id`
- `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderDetailPage.tsx`
  - add ticket block and create/open actions
- `D:\utkirov\work\2026\AI\new-crm-polig\src\i18n\ru.ts`
  - add ticket translations
- `D:\utkirov\work\2026\AI\new-crm-polig\src\i18n\uz.ts`
  - add ticket translations
- `D:\utkirov\work\2026\AI\new-crm-polig\tests\smoke.spec.ts`
  - add browser ticket flow
- `D:\utkirov\work\2026\AI\new-crm-polig\README.md`
  - document tickets and role behavior

### New files to create

- `D:\utkirov\work\2026\AI\new-crm-polig\src\types\tickets.ts`
  - optional helper types for ticket form payloads and role-filtered views
- `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\ticketUtils.ts`
  - validation helpers, status helpers, role guard helpers
- `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\ticketUtils.test.ts`
  - unit tests for ticket validation/status rules
- `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrderTickets.ts`
  - load list of tickets filtered by current role
- `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrderTicket.ts`
  - load one ticket with role checks
- `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketForm.tsx`
  - create/edit form for ticket assignments and status
- `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketStatusBadge.tsx`
  - compact reusable status badge
- `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketCard.tsx`
  - reusable row/card content for list views
- `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderTicketsPage.tsx`
  - role-aware list page
- `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderTicketDetailPage.tsx`
  - ticket detail page

## Task 1: Add Ticket Core Types And Validation Utilities

**Files:**
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\ticketUtils.ts`
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\ticketUtils.test.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\types\database.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\types\extended.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\types\index.ts`

- [ ] **Step 1: Write the failing ticket utility tests**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\ticketUtils.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to confirm failure**

Run:

```powershell
npm run test -- src/utils/ticketUtils.test.ts
```

Expected:
- FAIL because `ticketUtils.ts` and ticket types do not exist yet.

- [ ] **Step 3: Add ticket types**

Update `D:\utkirov\work\2026\AI\new-crm-polig\src\types\database.ts`:

```ts
export type OrderTicketStatus = 'new' | 'in_progress' | 'done'

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
```

Add the table:

```ts
order_tickets: TableDef<
  OrderTicket,
  Omit<OrderTicket, 'id' | 'created_at' | 'updated_at'>,
  Partial<Omit<OrderTicket, 'id' | 'created_at' | 'updated_at'>>
>
```

- [ ] **Step 4: Add derived types**

Update `D:\utkirov\work\2026\AI\new-crm-polig\src\types\extended.ts`:

```ts
import type { OrderTicket } from './database'

export interface OrderTicketDetail extends OrderTicket {
  order: OrderWithClient
  manager_assignee: Pick<Profile, 'id' | 'name'>
  designer_assignee: Pick<Profile, 'id' | 'name'>
  created_by_user: Pick<Profile, 'id' | 'name'>
}
```

Also extend `OrderDetail`:

```ts
  order_ticket?: OrderTicketDetail | null
```

- [ ] **Step 5: Re-export ticket types**

Update `D:\utkirov\work\2026\AI\new-crm-polig\src\types\index.ts` only if needed to expose any new ticket helper types.

- [ ] **Step 6: Implement ticket utility helpers**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\ticketUtils.ts`:

```ts
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
  if (!input.status || !isValidOrderTicketStatus(input.status)) return { valid: false as const, error: 'invalid_status' as const }
  if (!input.manager_assignee_role || !canAssignTicketRole('manager', input.manager_assignee_role)) {
    return { valid: false as const, error: 'invalid_manager_assignee' as const }
  }
  if (!input.designer_assignee_role || !canAssignTicketRole('designer', input.designer_assignee_role)) {
    return { valid: false as const, error: 'invalid_designer_assignee' as const }
  }
  return { valid: true as const }
}
```

- [ ] **Step 7: Run the ticket utility tests**

Run:

```powershell
npm run test -- src/utils/ticketUtils.test.ts
```

Expected:
- PASS with all tests green.

- [ ] **Step 8: Commit**

```powershell
git add src/types/database.ts src/types/extended.ts src/types/index.ts src/utils/ticketUtils.ts src/utils/ticketUtils.test.ts
git commit -m "feat: add order ticket types and validation helpers"
```

## Task 2: Extend Local DB With Order Ticket Storage And CRUD

**Files:**
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\lib\localDb.ts`

- [ ] **Step 1: Add the table to local schema**

Update the local DB structures:

```ts
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
```

Add storage:

```ts
order_tickets: OrderTicket[]
```

Add insert/update mapping:

```ts
order_tickets: Omit<OrderTicket, 'id' | 'created_at' | 'updated_at'>
```

- [ ] **Step 2: Seed a designer account and sample ticket-ready data**

In `createSeedData()` create a designer profile:

```ts
const designerId = createId('profile')

profiles.push({
  id: designerId,
  name: 'Дизайнер',
  role: 'designer',
  login: 'designer1',
  is_active: true,
  created_at: baseDate,
})

auth_accounts.push({
  id: designerId,
  email: 'designer1@crm.internal',
  password: '123456',
})
```

Add `order_tickets: []` to the returned DB state on first step. Keep the first release seed simple.

- [ ] **Step 3: Add migration and import compatibility**

In `migrateLegacyDatabase()`:

```ts
if (!Array.isArray((db as Partial<LocalDatabaseState>).order_tickets)) {
  db.order_tickets = []
  changed = true
}
```

In `validateImportedDatabase()`:

```ts
Array.isArray(candidate.order_tickets ?? [])
```

- [ ] **Step 4: Add row creation and materialization**

In `createRow()`:

```ts
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
```

In `materializeRows()` add:

```ts
case 'order_tickets':
  return (rows as unknown as OrderTicket[]).map((row) => buildOrderTicket(row, db))
```

- [ ] **Step 5: Add a ticket builder**

Create a `buildOrderTicket()` helper near the other builders:

```ts
function buildOrderTicket(ticket: OrderTicket, db: LocalDatabaseState) {
  const order = db.orders.find((item) => item.id === ticket.order_id)
  const manager = db.profiles.find((item) => item.id === ticket.manager_assignee_id)
  const designer = db.profiles.find((item) => item.id === ticket.designer_assignee_id)
  const createdBy = db.profiles.find((item) => item.id === ticket.created_by)

  return {
    ...clone(ticket),
    order: order ? buildOrder(order, db) : null,
    manager_assignee: manager ? { id: manager.id, name: manager.name } : null,
    designer_assignee: designer ? { id: designer.id, name: designer.name } : null,
    created_by_user: createdBy ? { id: createdBy.id, name: createdBy.name } : null,
  }
}
```

- [ ] **Step 6: Add explicit ticket CRUD helpers**

Export these helpers:

```ts
export async function createOrderTicket(input: {
  order_id: string
  title: string
  description?: string | null
  status?: OrderTicketStatus
  manager_assignee_id: string
  designer_assignee_id: string
  deadline?: string | null
  created_by: string
}) { /* validate, enforce one ticket per order, insert */ }

export async function updateOrderTicket(input: {
  ticketId: string
  title?: string
  description?: string | null
  status?: OrderTicketStatus
  manager_assignee_id?: string
  designer_assignee_id?: string
  deadline?: string | null
}) { /* update + updated_at */ }

export async function getOrderTickets() {
  return localDb.from('order_tickets').select('*').order('updated_at', { ascending: false })
}
```

Inside `createOrderTicket()` enforce one-ticket-per-order:

```ts
const existing = db.order_tickets.find((item) => item.order_id === input.order_id)
if (existing) return { data: null, error: 'ticket_exists_for_order' }
```

- [ ] **Step 7: Add `order_tickets` to reset/import notifications**

Append `'order_tickets'` to both `tables: TableName[]` arrays used in reset/import.

- [ ] **Step 8: Run focused verification**

Run:

```powershell
npm run test
npm run build
```

Expected:
- PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/lib/localDb.ts
git commit -m "feat: add local order ticket storage"
```

## Task 3: Add Ticket Hooks And Role-Based Querying

**Files:**
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrderTickets.ts`
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrderTicket.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrder.ts`

- [ ] **Step 1: Update order detail loading to include ticket**

In `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrder.ts`, after loading the order, fetch the ticket:

```ts
const { data: tickets } = await localDb
  .from('order_tickets')
  .select('*')
  .eq('order_id', id)
  .limit(1)

const order = data as unknown as OrderDetail
order.order_ticket = ((tickets as unknown as OrderTicketDetail[] | null)?.[0] ?? null)
```

Manager rule remains the same: only own orders. Designers will not use this hook for general order access.

- [ ] **Step 2: Create list hook**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrderTickets.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { getOrderTickets, localDb } from '../lib/localDb'
import { useAuthStore } from '../store/authStore'
import type { OrderTicketDetail } from '../types'

export function useOrderTickets() {
  const user = useAuthStore((state) => state.user)
  const [tickets, setTickets] = useState<OrderTicketDetail[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getOrderTickets()
    const allTickets = (data ?? []) as OrderTicketDetail[]

    const filtered = user?.role === 'director'
      ? allTickets
      : user?.role === 'manager'
        ? allTickets.filter((item) => item.manager_assignee?.id === user.id || item.order?.manager?.id === user.id)
        : user?.role === 'designer'
          ? allTickets.filter((item) => item.designer_assignee?.id === user.id)
          : []

    setTickets(filtered)
    setLoading(false)
  }, [user])

  useEffect(() => { void refetch() }, [refetch])

  useEffect(() => {
    const channel = localDb
      .channel(`order-tickets-${user?.id ?? 'anon'}`)
      .on('postgres_changes', { table: 'order_tickets' }, () => { void refetch() })
      .subscribe()

    return () => { void localDb.removeChannel(channel) }
  }, [refetch, user?.id])

  return { tickets, loading, refetch }
}
```

- [ ] **Step 3: Create detail hook**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useOrderTicket.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import { useAuthStore } from '../store/authStore'
import type { OrderTicketDetail } from '../types'

export function useOrderTicket(id: string | undefined) {
  const user = useAuthStore((state) => state.user)
  const [ticket, setTicket] = useState<OrderTicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!id) {
      setTicket(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await localDb.from('order_tickets').select('*').eq('id', id).single()
    const nextTicket = data as OrderTicketDetail | null

    if (!nextTicket) {
      setError('Ticket not found')
      setLoading(false)
      return
    }

    const forbidden =
      user?.role === 'designer' && nextTicket.designer_assignee?.id !== user.id
      || user?.role === 'manager' && nextTicket.order?.manager?.id !== user.id

    if (forbidden) {
      setError('Ticket not found')
      setLoading(false)
      return
    }

    setTicket(nextTicket)
    setError(null)
    setLoading(false)
  }, [id, user])

  useEffect(() => { void refetch() }, [refetch])
  return { ticket, loading, error, refetch }
}
```

- [ ] **Step 4: Verify hooks compile**

Run:

```powershell
npm run lint
```

Expected:
- PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useOrder.ts src/hooks/useOrderTickets.ts src/hooks/useOrderTicket.ts
git commit -m "feat: add order ticket data hooks"
```

## Task 4: Add Ticket UI Components

**Files:**
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketStatusBadge.tsx`
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketCard.tsx`
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketForm.tsx`

- [ ] **Step 1: Add reusable status badge**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketStatusBadge.tsx`:

```tsx
import { Badge } from './Badge'
import { useT } from '../i18n'
import type { OrderTicketStatus } from '../types'

export function OrderTicketStatusBadge({ status }: { status: OrderTicketStatus }) {
  const t = useT()
  const color = status === 'done' ? 'green' : status === 'in_progress' ? 'blue' : 'yellow'
  return <Badge color={color}>{t.ticketStatus[status]}</Badge>
}
```

- [ ] **Step 2: Add compact ticket card**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { formatDate } from '../utils/format'
import { OrderTicketStatusBadge } from './OrderTicketStatusBadge'
import type { OrderTicketDetail } from '../types'

export function OrderTicketCard({ ticket }: { ticket: OrderTicketDetail }) {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-blue-400 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{ticket.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            #{ticket.order?.order_number} • {ticket.order?.client?.name}
          </p>
        </div>
        <OrderTicketStatusBadge status={ticket.status} />
      </div>
      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Дедлайн: {formatDate(ticket.deadline)}
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Add create/edit form**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketForm.tsx`:

```tsx
import { useState } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { useT } from '../i18n'
import type { OrderTicketStatus, Profile } from '../types'

export function OrderTicketForm(props: {
  initialValues: {
    title: string
    description: string
    status: OrderTicketStatus
    manager_assignee_id: string
    designer_assignee_id: string
    deadline: string
  }
  managers: Array<Pick<Profile, 'id' | 'name'>>
  designers: Array<Pick<Profile, 'id' | 'name'>>
  onSubmit: (values: {
    title: string
    description: string
    status: OrderTicketStatus
    manager_assignee_id: string
    designer_assignee_id: string
    deadline: string
  }) => Promise<void>
}) {
  const t = useT()
  const [values, setValues] = useState(props.initialValues)
  const [saving, setSaving] = useState(false)

  const statusOptions = [
    { value: 'new', label: t.ticketStatus.new },
    { value: 'in_progress', label: t.ticketStatus.in_progress },
    { value: 'done', label: t.ticketStatus.done },
  ]

  const managerOptions = props.managers.map((item) => ({ value: item.id, label: item.name }))
  const designerOptions = props.designers.map((item) => ({ value: item.id, label: item.name }))

  const submit = async () => {
    setSaving(true)
    await props.onSubmit(values)
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <Input label={t.tickets.titleLabel} value={values.title} onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))} />
      <Input label={t.tickets.descriptionLabel} value={values.description} onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))} />
      <Select label={t.tickets.statusLabel} options={statusOptions} value={values.status} onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value as OrderTicketStatus }))} />
      <Select label={t.tickets.managerLabel} options={managerOptions} value={values.manager_assignee_id} onChange={(e) => setValues((prev) => ({ ...prev, manager_assignee_id: e.target.value }))} />
      <Select label={t.tickets.designerLabel} options={designerOptions} value={values.designer_assignee_id} onChange={(e) => setValues((prev) => ({ ...prev, designer_assignee_id: e.target.value }))} />
      <Input type="date" label={t.tickets.deadlineLabel} value={values.deadline} onChange={(e) => setValues((prev) => ({ ...prev, deadline: e.target.value }))} />
      <Button onClick={submit} loading={saving}>{t.common.save}</Button>
    </div>
  )
}
```

- [ ] **Step 4: Run lint**

Run:

```powershell
npm run lint
```

Expected:
- PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/OrderTicketStatusBadge.tsx src/components/OrderTicketCard.tsx src/components/OrderTicketForm.tsx
git commit -m "feat: add order ticket UI components"
```

## Task 5: Add Tickets Pages And Routes

**Files:**
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderTicketsPage.tsx`
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderTicketDetailPage.tsx`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\App.tsx`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\layouts\Sidebar.tsx`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\i18n\ru.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\i18n\uz.ts`

- [ ] **Step 1: Add ticket list page**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderTicketsPage.tsx`:

```tsx
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Spinner } from '../components/Spinner'
import { OrderTicketCard } from '../components/OrderTicketCard'
import { useOrderTickets } from '../hooks/useOrderTickets'
import { useT } from '../i18n'

export function OrderTicketsPage() {
  const t = useT()
  const { tickets, loading } = useOrderTickets()

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-blue-600" /></div>
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs items={[{ label: t.tickets.title }]} />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{t.tickets.title}</h1>
      </div>
      <div className="p-4 md:p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {tickets.length === 0 ? (
          <div className="text-slate-500 dark:text-slate-400">{t.tickets.empty}</div>
        ) : tickets.map((ticket) => (
          <OrderTicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add ticket detail page**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderTicketDetailPage.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Spinner } from '../components/Spinner'
import { OrderTicketStatusBadge } from '../components/OrderTicketStatusBadge'
import { useOrderTicket } from '../hooks/useOrderTicket'
import { useT } from '../i18n'
import { formatDate } from '../utils/format'

export function OrderTicketDetailPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const { ticket, loading, error } = useOrderTicket(id)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-blue-600" /></div>
  }

  if (error || !ticket) {
    return <div className="p-8 text-center text-red-500">{error ?? t.common.notFound}</div>
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs items={[{ label: t.tickets.title, to: '/tickets' }, { label: ticket.title }]} />
        <div className="flex items-center justify-between mt-2 gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{ticket.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              <Link to={`/orders/${ticket.order?.id}`} className="text-blue-600 hover:underline">
                #{ticket.order?.order_number}
              </Link>
              {' '}• {ticket.order?.client?.name}
            </p>
          </div>
          <OrderTicketStatusBadge status={ticket.status} />
        </div>
      </div>
      <div className="p-4 md:p-6 max-w-4xl flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <p><strong>{t.tickets.managerLabel}:</strong> {ticket.manager_assignee?.name}</p>
          <p><strong>{t.tickets.designerLabel}:</strong> {ticket.designer_assignee?.name}</p>
          <p><strong>{t.tickets.deadlineLabel}:</strong> {formatDate(ticket.deadline)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t.tickets.descriptionLabel}</p>
          <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{ticket.description || '-'}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire routes**

In `D:\utkirov\work\2026\AI\new-crm-polig\src\App.tsx` add lazy imports:

```ts
const OrderTicketsPage = lazy(() => import('./pages/OrderTicketsPage').then(m => ({ default: m.OrderTicketsPage })))
const OrderTicketDetailPage = lazy(() => import('./pages/OrderTicketDetailPage').then(m => ({ default: m.OrderTicketDetailPage })))
```

Add routes:

```tsx
<Route path="/tickets"
  element={<ProtectedRoute allowedRoles={['director', 'manager', 'designer']}><S><OrderTicketsPage /></S></ProtectedRoute>} />
<Route path="/tickets/:id"
  element={<ProtectedRoute allowedRoles={['director', 'manager', 'designer']}><S><OrderTicketDetailPage /></S></ProtectedRoute>} />
```

- [ ] **Step 4: Add sidebar nav**

In `D:\utkirov\work\2026\AI\new-crm-polig\src\layouts\Sidebar.tsx`:

- import a simple ticket icon or reuse an existing one
- add `tickets` nav item for `director`, `manager`, `designer`
- add a dedicated `designerNav` containing at minimum `{ to: '/tickets', label: t.nav.tickets, icon: <TicketIcon /> }`
- update `navItems` selection to handle designer explicitly

- [ ] **Step 5: Add translations**

In both translation files add:

```ts
nav: {
  tickets: 'Тикеты',
}

ticketStatus: {
  new: 'Новый',
  in_progress: 'В работе',
  done: 'Готово',
}

tickets: {
  title: 'Тикеты',
  empty: 'Нет тикетов',
  titleLabel: 'Название тикета',
  descriptionLabel: 'Описание',
  statusLabel: 'Статус',
  managerLabel: 'Менеджер',
  designerLabel: 'Дизайнер',
  deadlineLabel: 'Дедлайн',
  create: 'Создать тикет',
  open: 'Открыть тикет',
}
```

- [ ] **Step 6: Run lint and build**

Run:

```powershell
npm run lint
npm run build
```

Expected:
- PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/OrderTicketsPage.tsx src/pages/OrderTicketDetailPage.tsx src/App.tsx src/layouts/Sidebar.tsx src/i18n/ru.ts src/i18n/uz.ts
git commit -m "feat: add ticket list and detail pages"
```

## Task 6: Add Ticket Block To Order Detail And Ticket Creation Flow

**Files:**
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderDetailPage.tsx`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useUsers.ts`
- Reuse: `D:\utkirov\work\2026\AI\new-crm-polig\src\components\OrderTicketForm.tsx`

- [ ] **Step 1: Extend useUsers if needed**

If `useUsers()` already returns all profiles, keep it. Otherwise ensure the order detail page can derive manager/designer option lists from it.

- [ ] **Step 2: Add a ticket section to order detail**

In `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\OrderDetailPage.tsx`, insert a new card under order details:

```tsx
<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t.tickets.title}</h2>
  {!order.order_ticket ? (
    <Button onClick={() => setTicketModalOpen(true)}>{t.tickets.create}</Button>
  ) : (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-100">{order.order_ticket.title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t.tickets.managerLabel}: {order.order_ticket.manager_assignee?.name} • {t.tickets.designerLabel}: {order.order_ticket.designer_assignee?.name}
        </p>
      </div>
      <Link to={`/tickets/${order.order_ticket.id}`}>
        <Button variant="secondary">{t.tickets.open}</Button>
      </Link>
    </div>
  )}
</div>
```

- [ ] **Step 3: Add ticket creation modal**

Use local state:

```tsx
const [ticketModalOpen, setTicketModalOpen] = useState(false)
```

Load users and build role options:

```tsx
const { users: allUsers } = useUsers()
const managers = allUsers.filter((item) => item.role === 'manager' && item.is_active)
const designers = allUsers.filter((item) => item.role === 'designer' && item.is_active)
```

Submit handler:

```tsx
const handleCreateTicket = async (values: {
  title: string
  description: string
  status: OrderTicketStatus
  manager_assignee_id: string
  designer_assignee_id: string
  deadline: string
}) => {
  const { error } = await createOrderTicket({
    order_id: order.id,
    title: values.title,
    description: values.description,
    status: values.status,
    manager_assignee_id: values.manager_assignee_id,
    designer_assignee_id: values.designer_assignee_id,
    deadline: values.deadline || null,
    created_by: user!.id,
  })

  if (error) {
    toastError(t.common.error)
    return
  }

  toastSuccess(t.tickets.create)
  setTicketModalOpen(false)
  refetch()
}
```

Initial values:

```tsx
{
  title: order.title,
  description: order.description ?? '',
  status: 'new',
  manager_assignee_id: order.manager?.id ?? '',
  designer_assignee_id: designers[0]?.id ?? '',
  deadline: order.deadline ?? '',
}
```

- [ ] **Step 4: Run lint and build**

Run:

```powershell
npm run lint
npm run build
```

Expected:
- PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/OrderDetailPage.tsx src/hooks/useUsers.ts
git commit -m "feat: create order tickets from order detail"
```

## Task 7: Add Smoke Coverage And README Update

**Files:**
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\tests\smoke.spec.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\README.md`

- [ ] **Step 1: Extend smoke test with the full ticket flow**

Append a second Playwright scenario or extend the existing one:

```ts
test('director creates ticket and designer completes it', async ({ page, browser }) => {
  await page.goto('/login')
  await page.getByLabel('Логин').fill('director')
  await page.getByLabel('Пароль').fill('123456')
  await page.getByRole('button', { name: 'Войти' }).click()

  await page.goto('/users')
  const hasDesigner = await page.getByText('designer1').count()
  expect(hasDesigner).toBeGreaterThan(0)

  await page.goto('/dashboard')
  await page.getByText('Печать визиток').click()
  await page.getByRole('button', { name: 'Создать тикет' }).click()
  await page.getByRole('combobox', { name: 'Дизайнер' }).selectOption({ index: 0 })
  await page.getByRole('button', { name: 'Сохранить' }).click()

  await page.goto('/tickets')
  await expect(page.getByText('Печать визиток')).toBeVisible()

  const context = await browser.newContext()
  const designerPage = await context.newPage()
  await designerPage.goto('/login')
  await designerPage.getByLabel('Логин').fill('designer1')
  await designerPage.getByLabel('Пароль').fill('123456')
  await designerPage.getByRole('button', { name: 'Войти' }).click()
  await designerPage.goto('/tickets')
  await expect(designerPage.getByText('Печать визиток')).toBeVisible()
  await designerPage.getByText('Печать визиток').click()
  await designerPage.getByRole('combobox', { name: 'Статус' }).selectOption('in_progress')
  await designerPage.getByRole('button', { name: 'Сохранить' }).click()
  await designerPage.getByRole('combobox', { name: 'Статус' }).selectOption('done')
  await designerPage.getByRole('button', { name: 'Сохранить' }).click()
  await context.close()
})
```

- [ ] **Step 2: Document the ticket module**

Append to `D:\utkirov\work\2026\AI\new-crm-polig\README.md`:

```md
## Order Tickets

- one ticket per order
- tickets are created only inside an order
- ticket assignees: `manager` and `designer`
- shared status flow: `new -> in_progress -> done`
- `director` and `manager` create and manage tickets
- `designer` works from the tickets list and sees only assigned tickets
```

- [ ] **Step 3: Run the full verification set**

Run:

```powershell
npm run test
npm run lint
npm run build
npm run smoke
```

Expected:
- All commands PASS.

- [ ] **Step 4: Commit**

```powershell
git add tests/smoke.spec.ts README.md
git commit -m "test: cover order ticket workflow"
```

## Self-Review

### Spec coverage

- one ticket per order: Task 2 and Task 6
- ticket only inside order: Task 6
- manager + designer assignments: Task 1, Task 2, Task 4, Task 6
- shared status `new -> in_progress -> done`: Task 1, Task 4, Task 5
- role-based visibility: Task 3 and Task 5
- dedicated list/detail pages: Task 5
- minimal first release only: all tasks avoid comments, attachments, subtasks, and notifications

### Placeholder scan

- no `TODO` or `TBD`
- each task includes real file paths and concrete code
- verification commands are explicit

### Type consistency

- `order_tickets` is used consistently as the storage/table name
- `OrderTicketStatus` is used consistently as the status type
- route names are consistent: `/tickets` and `/tickets/:id`
- role names are consistent: `director`, `manager`, `designer`, `financier`

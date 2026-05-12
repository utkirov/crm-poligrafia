# KPI For Managers And Designers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monthly KPI management for `manager` and `designer` users with director-only access, local persistence, a dedicated employee KPI page, and automated verification.

**Architecture:** Extend the existing local-first CRM model by adding a new `designer` role plus a dedicated `monthly_kpis` entity in the local DB. Keep the users table compact, route KPI editing to a dedicated page, and implement KPI persistence as an upsert by `user_id + month` so the first stage stores only plan values without changing the rest of the product model.

**Tech Stack:** React 19, TypeScript, React Router 7, Zustand, localStorage-backed local DB, Vitest, Playwright.

---

## File Structure

### Existing files to modify

- `D:\utkirov\work\2026\AI\new-crm-polig\src\types\database.ts`
  - Extend `UserRole`
  - Add `MonthlyKpi` type
  - Add `monthly_kpis` table to `Database`
- `D:\utkirov\work\2026\AI\new-crm-polig\src\types\extended.ts`
  - Add derived KPI-related view types if needed
- `D:\utkirov\work\2026\AI\new-crm-polig\src\lib\localDb.ts`
  - Add `monthly_kpis` to local schema, seed, validation, import/export/reset, materialization, row creation, and helper functions
  - Add KPI-specific CRUD/upsert helpers
- `D:\utkirov\work\2026\AI\new-crm-polig\src\components\UserFormModal.tsx`
  - Add `designer` to role options
- `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\UsersPage.tsx`
  - Add `KPI` action for `manager` and `designer`
- `D:\utkirov\work\2026\AI\new-crm-polig\src\App.tsx`
  - Add lazy page import and route
- `D:\utkirov\work\2026\AI\new-crm-polig\src\i18n\ru.ts`
  - Add KPI texts and role label for `designer`
- `D:\utkirov\work\2026\AI\new-crm-polig\src\i18n\uz.ts`
  - Add KPI texts and role label for `designer`
- `D:\utkirov\work\2026\AI\new-crm-polig\tests\smoke.spec.ts`
  - Extend smoke flow with KPI save/load for `designer`

### New files to create

- `D:\utkirov\work\2026\AI\new-crm-polig\src\types\kpi.ts`
  - KPI-specific helper types and role metric keys
- `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.ts`
  - Month normalization, role metric selection, KPI validation helpers
- `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.test.ts`
  - Unit tests for KPI utilities
- `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useMonthlyKpis.ts`
  - Load employee KPI history and selected month record
- `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\UserKpiPage.tsx`
  - Dedicated employee KPI page

## Task 1: Extend Core Types For Designer And Monthly KPI

**Files:**
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\types\kpi.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\types\database.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\types\index.ts`
- Test: `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.test.ts`

- [ ] **Step 1: Write the failing type-driven unit tests**

```ts
import { describe, expect, it } from 'vitest'
import { getRoleKpiFields, normalizeKpiMonth, validateMonthlyKpiInput } from './kpiUtils'

describe('kpiUtils', () => {
  it('normalizes a month input to YYYY-MM', () => {
    expect(normalizeKpiMonth('2026-5')).toBe('2026-05')
    expect(normalizeKpiMonth('2026-05')).toBe('2026-05')
  })

  it('returns manager KPI fields only for manager role', () => {
    expect(getRoleKpiFields('manager')).toEqual(['sales_plan', 'orders_plan', 'new_clients_plan'])
  })

  it('returns designer KPI fields only for designer role', () => {
    expect(getRoleKpiFields('designer')).toEqual(['tasks_plan', 'on_time_rate_plan', 'revision_limit_plan'])
  })

  it('rejects KPI input for unsupported roles', () => {
    expect(validateMonthlyKpiInput({
      role: 'director',
      month: '2026-05',
    })).toEqual({ valid: false, error: 'unsupported_role' })
  })
})
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run:

```powershell
npm run test -- src/utils/kpiUtils.test.ts
```

Expected:
- FAIL because `kpiUtils.ts` does not exist yet.

- [ ] **Step 3: Add KPI-specific types**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\types\kpi.ts`:

```ts
export type KpiEligibleRole = 'manager' | 'designer'

export type ManagerKpiField = 'sales_plan' | 'orders_plan' | 'new_clients_plan'
export type DesignerKpiField = 'tasks_plan' | 'on_time_rate_plan' | 'revision_limit_plan'
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
```

- [ ] **Step 4: Extend database types**

Update `D:\utkirov\work\2026\AI\new-crm-polig\src\types\database.ts`:

```ts
export type UserRole = 'director' | 'financier' | 'manager' | 'designer'

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
```

Also add the new table:

```ts
monthly_kpis: TableDef<
  MonthlyKpi,
  Omit<MonthlyKpi, 'id' | 'created_at' | 'updated_at'>,
  Partial<Omit<MonthlyKpi, 'id' | 'created_at' | 'updated_at'>>
>
```

- [ ] **Step 5: Re-export the new KPI types**

Update `D:\utkirov\work\2026\AI\new-crm-polig\src\types\index.ts`:

```ts
export * from './database'
export * from './extended'
export * from './kpi'
```

- [ ] **Step 6: Run tests to verify type layer is ready**

Run:

```powershell
npm run test -- src/utils/kpiUtils.test.ts
```

Expected:
- Still FAIL, but now only because `kpiUtils.ts` is not implemented, not because types are missing.

- [ ] **Step 7: Commit**

```powershell
git add src/types/database.ts src/types/index.ts src/types/kpi.ts
git commit -m "feat: add designer role and monthly KPI types"
```

## Task 2: Add KPI Utility Layer And Validation

**Files:**
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.ts`
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.test.ts`

- [ ] **Step 1: Write the complete failing test file**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getRoleKpiFields, normalizeKpiMonth, sanitizeMonthlyKpiPayload, validateMonthlyKpiInput } from './kpiUtils'

describe('kpiUtils', () => {
  it('normalizes month values', () => {
    expect(normalizeKpiMonth('2026-5')).toBe('2026-05')
    expect(normalizeKpiMonth('2026-05')).toBe('2026-05')
  })

  it('keeps only manager KPI fields for manager payload', () => {
    expect(sanitizeMonthlyKpiPayload({
      user_id: 'u1',
      month: '2026-05',
      role: 'manager',
      sales_plan: 1000000,
      orders_plan: 30,
      new_clients_plan: 10,
      tasks_plan: 99,
    })).toMatchObject({
      role: 'manager',
      sales_plan: 1000000,
      orders_plan: 30,
      new_clients_plan: 10,
      tasks_plan: null,
    })
  })

  it('keeps only designer KPI fields for designer payload', () => {
    expect(sanitizeMonthlyKpiPayload({
      user_id: 'u2',
      month: '2026-05',
      role: 'designer',
      tasks_plan: 40,
      on_time_rate_plan: 95,
      revision_limit_plan: 2,
      sales_plan: 500,
    })).toMatchObject({
      role: 'designer',
      tasks_plan: 40,
      on_time_rate_plan: 95,
      revision_limit_plan: 2,
      sales_plan: null,
    })
  })

  it('rejects invalid on-time rate values', () => {
    expect(validateMonthlyKpiInput({
      role: 'designer',
      month: '2026-05',
      on_time_rate_plan: 120,
    })).toEqual({ valid: false, error: 'invalid_on_time_rate' })
  })

  it('returns allowed KPI fields by role', () => {
    expect(getRoleKpiFields('manager')).toEqual(['sales_plan', 'orders_plan', 'new_clients_plan'])
    expect(getRoleKpiFields('designer')).toEqual(['tasks_plan', 'on_time_rate_plan', 'revision_limit_plan'])
  })
})
```

- [ ] **Step 2: Run the test to confirm failure**

Run:

```powershell
npm run test -- src/utils/kpiUtils.test.ts
```

Expected:
- FAIL with import/module errors because `kpiUtils.ts` does not exist yet.

- [ ] **Step 3: Implement KPI utility helpers**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.ts`:

```ts
import type { KpiEligibleRole, MonthlyKpiInput, MonthlyKpiField } from '../types'

const MANAGER_FIELDS: MonthlyKpiField[] = ['sales_plan', 'orders_plan', 'new_clients_plan']
const DESIGNER_FIELDS: MonthlyKpiField[] = ['tasks_plan', 'on_time_rate_plan', 'revision_limit_plan']

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
  if (!isKpiEligibleRole(input.role)) {
    return {
      ...input,
      month: normalizeKpiMonth(input.month),
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
    month: normalizeKpiMonth(input.month),
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
    return { valid: false, error: 'invalid_month' as const }
  }

  if (!input.role || !isKpiEligibleRole(input.role)) {
    return { valid: false, error: 'unsupported_role' as const }
  }

  if (typeof input.on_time_rate_plan === 'number' && (input.on_time_rate_plan < 0 || input.on_time_rate_plan > 100)) {
    return { valid: false, error: 'invalid_on_time_rate' as const }
  }

  const numbers = [
    input.sales_plan,
    input.orders_plan,
    input.new_clients_plan,
    input.tasks_plan,
    input.on_time_rate_plan,
    input.revision_limit_plan,
  ]

  if (numbers.some((value) => typeof value === 'number' && value < 0)) {
    return { valid: false, error: 'negative_value' as const }
  }

  return { valid: true as const }
}
```

- [ ] **Step 4: Run the utility tests**

Run:

```powershell
npm run test -- src/utils/kpiUtils.test.ts
```

Expected:
- PASS with all KPI utility tests green.

- [ ] **Step 5: Commit**

```powershell
git add src/utils/kpiUtils.ts src/utils/kpiUtils.test.ts
git commit -m "feat: add KPI utility and validation helpers"
```

## Task 3: Extend Local DB With Monthly KPI Storage And Upsert

**Files:**
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\lib\localDb.ts`
- Test: `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.test.ts`

- [ ] **Step 1: Write the failing upsert-focused tests**

Append to `D:\utkirov\work\2026\AI\new-crm-polig\src\utils\kpiUtils.test.ts`:

```ts
it('normalizes duplicate month keys to a single month format', () => {
  expect(normalizeKpiMonth('2026-5')).toBe(normalizeKpiMonth('2026-05'))
})
```

Note:
- The real `user_id + month` upsert behavior will be covered in browser smoke because current local DB has no isolated unit test harness exported.

- [ ] **Step 2: Extend local DB schema**

Update these sections in `D:\utkirov\work\2026\AI\new-crm-polig\src\lib\localDb.ts`:

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
  auth_accounts: LocalAuthAccount[]
}
```

- [ ] **Step 3: Add seed and migration defaults**

In `createSeedData()` add:

```ts
const monthly_kpis: MonthlyKpi[] = [
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
```

And return it:

```ts
monthly_kpis,
```

In `validateImportedDatabase()` accept old snapshots by checking:

```ts
Array.isArray(candidate.monthly_kpis ?? [])
```

In `migrateLegacyDatabase()` initialize missing arrays:

```ts
if (!Array.isArray((db as Partial<LocalDatabaseState>).monthly_kpis)) {
  ;(db as LocalDatabaseState).monthly_kpis = []
  changed = true
}
```

- [ ] **Step 4: Add row creation and materialization**

In `createRow()` add:

```ts
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
```

In `materializeRows()` add:

```ts
case 'monthly_kpis':
  return clone(rows)
```

- [ ] **Step 5: Add KPI helpers for lookup and upsert**

Near the exported helper functions in `localDb.ts`, add:

```ts
export async function upsertMonthlyKpi(input: MonthlyKpiInput) {
  const validation = validateMonthlyKpiInput(input)
  if (!validation.valid) {
    return { data: null, error: validation.error }
  }

  const db = loadDatabase()
  const nextDb = clone(db)
  const payload = sanitizeMonthlyKpiPayload(input)
  const existing = nextDb.monthly_kpis.find((item) => item.user_id === payload.user_id && item.month === payload.month)

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
```

Also export:

```ts
export async function getUserMonthlyKpis(userId: string) {
  return localDb.from('monthly_kpis').select('*').eq('user_id', userId).order('month', { ascending: false })
}
```

- [ ] **Step 6: Add `monthly_kpis` to import/export/reset change notifications**

Extend both `tables: TableName[]` arrays in `resetLocalDemoData()` and `importLocalDatabaseSnapshot()`:

```ts
'monthly_kpis',
```

- [ ] **Step 7: Run the full unit suite**

Run:

```powershell
npm run test
```

Expected:
- PASS with KPI utility tests green.

- [ ] **Step 8: Commit**

```powershell
git add src/lib/localDb.ts src/utils/kpiUtils.ts src/utils/kpiUtils.test.ts
git commit -m "feat: add monthly KPI local storage and upsert"
```

## Task 4: Add KPI Loading Hook And Employee KPI Page

**Files:**
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useMonthlyKpis.ts`
- Create: `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\UserKpiPage.tsx`

- [ ] **Step 1: Write the data hook**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\hooks\useMonthlyKpis.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { getUserMonthlyKpis, localDb } from '../lib/localDb'
import type { MonthlyKpi } from '../types'

export function useMonthlyKpis(userId?: string) {
  const [items, setItems] = useState<MonthlyKpi[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await getUserMonthlyKpis(userId)
    setItems((data ?? []) as MonthlyKpi[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    const channel = localDb
      .channel(`monthly-kpis-${userId ?? 'none'}`)
      .on('postgres_changes', { table: 'monthly_kpis' }, () => { void refetch() })
      .subscribe()

    return () => {
      void localDb.removeChannel(channel)
    }
  }, [refetch, userId])

  return { items, loading, refetch }
}
```

- [ ] **Step 2: Create the KPI page**

Create `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\UserKpiPage.tsx` with this structure:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Spinner } from '../components/Spinner'
import { useUsers } from '../hooks/useUsers'
import { useMonthlyKpis } from '../hooks/useMonthlyKpis'
import { upsertMonthlyKpi } from '../lib/localDb'
import { useT } from '../i18n'
import { getRoleKpiFields, isKpiEligibleRole, normalizeKpiMonth } from '../utils/kpiUtils'

export function UserKpiPage() {
  const t = useT()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { users, loading: usersLoading } = useUsers()
  const employee = useMemo(() => users.find((item) => item.id === id) ?? null, [id, users])
  const { items, loading, refetch } = useMonthlyKpis(id)
  const [month, setMonth] = useState('2026-05')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const existing = useMemo(
    () => items.find((item) => item.month === normalizeKpiMonth(month)) ?? null,
    [items, month],
  )

  useEffect(() => {
    if (!employee || !isKpiEligibleRole(employee.role)) return
    const source = existing ?? {
      sales_plan: 0,
      orders_plan: 0,
      new_clients_plan: 0,
      tasks_plan: 0,
      on_time_rate_plan: 0,
      revision_limit_plan: 0,
    }
    setValues({
      sales_plan: String(source.sales_plan ?? 0),
      orders_plan: String(source.orders_plan ?? 0),
      new_clients_plan: String(source.new_clients_plan ?? 0),
      tasks_plan: String(source.tasks_plan ?? 0),
      on_time_rate_plan: String(source.on_time_rate_plan ?? 0),
      revision_limit_plan: String(source.revision_limit_plan ?? 0),
    })
  }, [employee, existing])

  if (usersLoading || loading) {
    return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-blue-600" /></div>
  }

  if (!employee) {
    return <div className="p-8 text-center text-red-500">{t.users.noUsers}</div>
  }

  if (!isKpiEligibleRole(employee.role)) {
    return <div className="p-8 text-center text-slate-500">KPI поддерживается только для менеджера и дизайнера</div>
  }

  const fields = getRoleKpiFields(employee.role)

  const handleSave = async () => {
    setSaving(true)
    await upsertMonthlyKpi({
      user_id: employee.id,
      month,
      role: employee.role,
      sales_plan: Number(values.sales_plan || 0),
      orders_plan: Number(values.orders_plan || 0),
      new_clients_plan: Number(values.new_clients_plan || 0),
      tasks_plan: Number(values.tasks_plan || 0),
      on_time_rate_plan: Number(values.on_time_rate_plan || 0),
      revision_limit_plan: Number(values.revision_limit_plan || 0),
    })
    setSaving(false)
    refetch()
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs items={[{ label: t.users.title, to: '/users' }, { label: employee.name }, { label: 'KPI' }]} />
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">KPI: {employee.name}</h1>
          <Button variant="secondary" onClick={() => navigate('/users')}>{t.common.back}</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Expand the page with actual role-based inputs and history table**

Inside the page body, add:

```tsx
<div className="p-4 md:p-6 max-w-5xl flex flex-col gap-6">
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="Месяц"
        type="month"
        value={month}
        onChange={(event) => setMonth(event.target.value)}
      />
      {fields.includes('sales_plan') ? (
        <Input label="План продаж" value={values.sales_plan ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, sales_plan: event.target.value }))} />
      ) : null}
      {fields.includes('orders_plan') ? (
        <Input label="План заказов" value={values.orders_plan ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, orders_plan: event.target.value }))} />
      ) : null}
      {fields.includes('new_clients_plan') ? (
        <Input label="План новых клиентов" value={values.new_clients_plan ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, new_clients_plan: event.target.value }))} />
      ) : null}
      {fields.includes('tasks_plan') ? (
        <Input label="План задач" value={values.tasks_plan ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, tasks_plan: event.target.value }))} />
      ) : null}
      {fields.includes('on_time_rate_plan') ? (
        <Input label="План выполнения в срок, %" value={values.on_time_rate_plan ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, on_time_rate_plan: event.target.value }))} />
      ) : null}
      {fields.includes('revision_limit_plan') ? (
        <Input label="Лимит правок" value={values.revision_limit_plan ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, revision_limit_plan: event.target.value }))} />
      ) : null}
    </div>
    <div className="mt-4">
      <Button onClick={handleSave} loading={saving}>Сохранить KPI</Button>
    </div>
  </div>

  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
    <table className="w-full text-sm">
      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <tr>
          <th className="px-4 py-3 text-left">Месяц</th>
          <th className="px-4 py-3 text-left">Показатели</th>
          <th className="px-4 py-3 text-left">Обновлено</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700">
            <td className="px-4 py-3">{item.month}</td>
            <td className="px-4 py-3">
              {item.role === 'manager'
                ? `Продажи: ${item.sales_plan ?? 0}, Заказы: ${item.orders_plan ?? 0}, Новые клиенты: ${item.new_clients_plan ?? 0}`
                : `Задачи: ${item.tasks_plan ?? 0}, В срок: ${item.on_time_rate_plan ?? 0}%, Правки: ${item.revision_limit_plan ?? 0}`}
            </td>
            <td className="px-4 py-3">{item.updated_at.slice(0, 10)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

- [ ] **Step 4: Run lint to validate the new page and hook**

Run:

```powershell
npm run lint
```

Expected:
- PASS with no new lint errors.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useMonthlyKpis.ts src/pages/UserKpiPage.tsx
git commit -m "feat: add employee monthly KPI page"
```

## Task 5: Wire KPI Into Users UI, Routing, And Translations

**Files:**
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\components\UserFormModal.tsx`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\UsersPage.tsx`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\App.tsx`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\i18n\ru.ts`
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\src\i18n\uz.ts`

- [ ] **Step 1: Add designer to the user form**

Update `D:\utkirov\work\2026\AI\new-crm-polig\src\components\UserFormModal.tsx`:

```ts
  const roleOptions = [
    { value: 'manager', label: t.roles.manager },
    { value: 'designer', label: t.roles.designer },
    { value: 'financier', label: t.roles.financier },
    { value: 'director', label: t.roles.director },
  ]
```

- [ ] **Step 2: Add KPI action to the users table**

In `D:\utkirov\work\2026\AI\new-crm-polig\src\pages\UsersPage.tsx`:

```tsx
import { Link } from 'react-router-dom'
```

Then inside row actions:

```tsx
{(user.role === 'manager' || user.role === 'designer') ? (
  <Link
    to={`/users/${user.id}/kpi`}
    className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
  >
    KPI
  </Link>
) : null}
```

And role badge color:

```tsx
<Badge color={
  user.role === 'director'
    ? 'purple'
    : user.role === 'financier'
      ? 'blue'
      : user.role === 'designer'
        ? 'yellow'
        : 'gray'
}>
```

- [ ] **Step 3: Add KPI route**

In `D:\utkirov\work\2026\AI\new-crm-polig\src\App.tsx` add lazy import:

```ts
const UserKpiPage = lazy(() => import('./pages/UserKpiPage').then(m => ({ default: m.UserKpiPage })))
```

Add route:

```tsx
<Route path="/users/:id/kpi"
  element={<ProtectedRoute allowedRoles={['director']}><S><UserKpiPage /></S></ProtectedRoute>} />
```

- [ ] **Step 4: Add translation keys**

In both translation files add:

```ts
roles: {
  director: '...',
  financier: '...',
  manager: '...',
  designer: '...'
}
```

And KPI page section:

```ts
userKpi: {
  title: 'KPI сотрудника',
  monthLabel: 'Месяц',
  save: 'Сохранить KPI',
  history: 'История KPI',
  unsupported: 'KPI поддерживается только для менеджера и дизайнера',
  salesPlan: 'План продаж',
  ordersPlan: 'План заказов',
  newClientsPlan: 'План новых клиентов',
  tasksPlan: 'План задач',
  onTimeRatePlan: 'План выполнения в срок, %',
  revisionLimitPlan: 'Лимит правок',
}
```

- [ ] **Step 5: Run lint and build**

Run:

```powershell
npm run lint
npm run build
```

Expected:
- Both commands PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/UserFormModal.tsx src/pages/UsersPage.tsx src/App.tsx src/i18n/ru.ts src/i18n/uz.ts
git commit -m "feat: wire KPI flow into users and routing"
```

## Task 6: Add Browser Smoke Coverage For KPI Save And Reload

**Files:**
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\tests\smoke.spec.ts`

- [ ] **Step 1: Extend the smoke test with designer KPI flow**

Append this flow near the users section in `D:\utkirov\work\2026\AI\new-crm-polig\tests\smoke.spec.ts`:

```ts
  await page.getByRole('link', { name: 'РЎРѕС‚СЂСѓРґРЅРёРєРё' }).click()
  await page.getByRole('button', { name: /\+ / }).click()
  await page.getByLabel(/РРјСЏ/).fill('Designer Smoke')
  await page.getByLabel(/Р›РѕРіРёРЅ/).fill('designer-smoke')
  await page.getByLabel(/^Р РѕР»СЊ/).selectOption('designer')
  await page.getByLabel(/^РџР°СЂРѕР»СЊ/).fill('123456')
  await page.getByLabel(/РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ/).fill('123456')
  await page.getByRole('button', { name: 'РЎРѕС…СЂР°РЅРёС‚СЊ' }).click()

  await page.getByRole('link', { name: 'KPI' }).last().click()
  await expect(page).toHaveURL(/\/users\/.*\/kpi/)
  await page.getByLabel('Месяц').fill('2026-05')
  await page.getByLabel('План задач').fill('40')
  await page.getByLabel('План выполнения в срок, %').fill('95')
  await page.getByLabel('Лимит правок').fill('2')
  await page.getByRole('button', { name: 'Сохранить KPI' }).click()
  await expect(page.getByText('2026-05')).toBeVisible()
  await page.reload()
  await expect(page.getByDisplayValue('40')).toBeVisible()
```

- [ ] **Step 2: Run smoke to verify the new flow**

Run:

```powershell
npm run smoke
```

Expected:
- PASS with the KPI creation and reload scenario green.

- [ ] **Step 3: Commit**

```powershell
git add tests/smoke.spec.ts
git commit -m "test: cover monthly KPI flow for designer"
```

## Task 7: Final Verification And Documentation Touch-Up

**Files:**
- Modify: `D:\utkirov\work\2026\AI\new-crm-polig\README.md`

- [ ] **Step 1: Add a short KPI section to README**

Append:

```md
## KPI

- KPI доступны только директору
- KPI поддерживаются для ролей `manager` и `designer`
- KPI хранятся по месяцам на странице `/users/:id/kpi`
- на первом этапе сохраняются только плановые показатели
```

- [ ] **Step 2: Run the full verification set**

Run:

```powershell
npm run test
npm run lint
npm run build
npm run smoke
```

Expected:
- All commands PASS.

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs: document monthly KPI workflow"
```

## Self-Review

### Spec coverage

- New `designer` role: covered in Task 1 and Task 5
- `monthly_kpis` entity: covered in Task 1 and Task 3
- KPI page per employee: covered in Task 4
- Director-only access: covered in Task 5 route guard
- Monthly history: covered in Task 4 history table
- Different metrics by role: covered in Task 2 and Task 4
- First stage stores only plan values: covered in Task 1, Task 2, Task 3, Task 4
- Tests: covered in Task 2, Task 6, Task 7

### Placeholder scan

- No `TODO` or `TBD` placeholders
- Each task includes file paths, concrete code, and exact commands
- Validation and upsert behavior are described concretely

### Type consistency

- Role names are consistent: `manager`, `designer`
- KPI storage name is consistent: `monthly_kpis`
- Route is consistent: `/users/:id/kpi`
- Upsert helper name is consistent: `upsertMonthlyKpi`


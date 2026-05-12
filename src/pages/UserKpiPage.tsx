import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Spinner } from '../components/Spinner'
import { useMonthlyKpis } from '../hooks/useMonthlyKpis'
import { useUsers } from '../hooks/useUsers'
import { upsertMonthlyKpi } from '../lib/localDb'
import { toastError, toastSuccess } from '../lib/toast'
import { useT } from '../i18n'
import type { MonthlyKpi } from '../types'
import { getRoleKpiFields, isKpiEligibleRole, normalizeKpiMonth } from '../utils/kpiUtils'

const EMPTY_VALUES: Record<string, string> = {
  sales_plan: '0',
  orders_plan: '0',
  new_clients_plan: '0',
  tasks_plan: '0',
  on_time_rate_plan: '0',
  revision_limit_plan: '0',
}

function mapKpiValues(source?: Partial<MonthlyKpi> | null) {
  return {
    sales_plan: String(source?.sales_plan ?? 0),
    orders_plan: String(source?.orders_plan ?? 0),
    new_clients_plan: String(source?.new_clients_plan ?? 0),
    tasks_plan: String(source?.tasks_plan ?? 0),
    on_time_rate_plan: String(source?.on_time_rate_plan ?? 0),
    revision_limit_plan: String(source?.revision_limit_plan ?? 0),
  }
}

function toMetricSummary(item: MonthlyKpi, t: ReturnType<typeof useT>) {
  if (item.role === 'manager') {
    return `${t.userKpi.salesPlan}: ${item.sales_plan ?? 0}, ${t.userKpi.ordersPlan}: ${item.orders_plan ?? 0}, ${t.userKpi.newClientsPlan}: ${item.new_clients_plan ?? 0}`
  }

  return `${t.userKpi.tasksPlan}: ${item.tasks_plan ?? 0}, ${t.userKpi.onTimeRatePlan}: ${item.on_time_rate_plan ?? 0}%, ${t.userKpi.revisionLimitPlan}: ${item.revision_limit_plan ?? 0}`
}

function UserKpiForm(props: {
  employeeId: string
  role: 'manager' | 'designer'
  month: string
  fields: ReturnType<typeof getRoleKpiFields>
  initialValues: Record<string, string>
  onSaveSuccess: () => Promise<void>
  t: ReturnType<typeof useT>
}) {
  const { employeeId, role, month, fields, initialValues, onSaveSuccess, t } = props
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [saving, setSaving] = useState(false)
  const fieldLabels: Record<string, string> = {
    sales_plan: t.userKpi.salesPlan,
    orders_plan: t.userKpi.ordersPlan,
    new_clients_plan: t.userKpi.newClientsPlan,
    tasks_plan: t.userKpi.tasksPlan,
    on_time_rate_plan: t.userKpi.onTimeRatePlan,
    revision_limit_plan: t.userKpi.revisionLimitPlan,
  }

  const handleValueChange = (field: string, nextValue: string) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }))
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await upsertMonthlyKpi({
      user_id: employeeId,
      month,
      role,
      sales_plan: Number(values.sales_plan || 0),
      orders_plan: Number(values.orders_plan || 0),
      new_clients_plan: Number(values.new_clients_plan || 0),
      tasks_plan: Number(values.tasks_plan || 0),
      on_time_rate_plan: Number(values.on_time_rate_plan || 0),
      revision_limit_plan: Number(values.revision_limit_plan || 0),
    })
    setSaving(false)

    if (error) {
      toastError(t.common.error)
      return
    }

    toastSuccess(t.userKpi.saveSuccess)
    await onSaveSuccess()
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <Input
            key={field}
            label={fieldLabels[field]}
            value={values[field] ?? ''}
            onChange={(event) => handleValueChange(field, event.target.value)}
            inputMode="decimal"
          />
        ))}
      </div>
      <div className="mt-4">
        <Button onClick={handleSave} loading={saving}>
          {t.userKpi.save}
        </Button>
      </div>
    </div>
  )
}

export function UserKpiPage() {
  const t = useT()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { users, loading: usersLoading } = useUsers()
  const { items, loading, refetch } = useMonthlyKpis(id)
  const [month, setMonth] = useState('2026-05')

  const employee = useMemo(() => users.find((item) => item.id === id) ?? null, [id, users])
  const normalizedMonth = normalizeKpiMonth(month)
  const existing = useMemo(
    () => items.find((item) => item.month === normalizedMonth) ?? null,
    [items, normalizedMonth],
  )

  const fields = employee && isKpiEligibleRole(employee.role)
    ? getRoleKpiFields(employee.role)
    : []

  const formKey = `${employee?.id ?? 'none'}:${normalizedMonth}:${existing?.updated_at ?? 'new'}`

  if (usersLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    )
  }

  if (!employee) {
    return <div className="p-8 text-center text-red-500">{t.users.noUsers}</div>
  }

  if (!isKpiEligibleRole(employee.role)) {
    return <div className="p-8 text-center text-slate-500">{t.userKpi.unsupported}</div>
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 py-4 border-b border-slate-200 bg-white md:px-6 dark:border-slate-700 dark:bg-slate-800">
        <Breadcrumbs
          items={[
            { label: t.users.title, to: '/users' },
            { label: employee.name },
            { label: t.userKpi.title },
          ]}
        />
        <div className="flex items-center justify-between mt-2 gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t.userKpi.title}: {employee.name}
          </h1>
          <Button variant="secondary" onClick={() => navigate('/users')}>
            {t.common.back}
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-5xl flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <Input
            label={t.userKpi.monthLabel}
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="md:max-w-sm"
          />
        </div>

        <UserKpiForm
          key={formKey}
          employeeId={employee.id}
          role={employee.role}
          month={normalizedMonth}
          fields={fields}
          initialValues={existing ? mapKpiValues(existing) : EMPTY_VALUES}
          onSaveSuccess={refetch}
          t={t}
        />

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t.userKpi.history}</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">{t.userKpi.monthLabel}</th>
                <th className="px-4 py-3 text-left">{t.userKpi.metrics}</th>
                <th className="px-4 py-3 text-left">{t.userKpi.updatedAt}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    {t.common.noData}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-3">{item.month}</td>
                    <td className="px-4 py-3">{toMetricSummary(item, t)}</td>
                    <td className="px-4 py-3">{item.updated_at.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

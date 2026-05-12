import { useCallback, useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { localDb } from '../lib/localDb'
import { formatCurrency } from '../utils/format'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { useT } from '../i18n'

interface MonthData {
  monthIdx: number
  year: number
  revenue: number
  orders: number
}

interface StatusData {
  status: string
  count: number
}

interface ClientData {
  name: string
  total: number
}

interface AnalyticsOrderRow {
  id: string
  total_amount: number
  status: string
  created_at: string
  client: { name: string | null } | null
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  in_progress: '#F59E0B',
  ready: '#10B981',
  completed: '#64748B',
  cancelled: '#EF4444',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload, label }: any) {
  const t = useT()
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-blue-600 dark:text-blue-400">
        {t.analytics.revenueLabel}: {formatCurrency(payload[0]?.value ?? 0)}
      </p>
      <p className="text-slate-500 dark:text-slate-400">
        {t.analytics.ordersLabel}: {payload[0]?.payload?.orders ?? 0}
      </p>
    </div>
  )
}

function buildSixMonthBuckets() {
  const cursor = new Date()
  cursor.setDate(1)

  return Array.from({ length: 6 }, (_, offset) => {
    const value = new Date(cursor)
    value.setMonth(cursor.getMonth() - (5 - offset))
    return {
      monthIdx: value.getMonth(),
      year: value.getFullYear(),
      revenue: 0,
      orders: 0,
    }
  })
}

export function AnalyticsSection() {
  const t = useT()
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [monthly, setMonthly] = useState<MonthData[]>([])
  const [byStatus, setByStatus] = useState<StatusData[]>([])
  const [topClients, setTopClients] = useState<ClientData[]>([])

  const loadAnalytics = useCallback(async () => {
    setLoading(true)

    const sixAgo = new Date()
    sixAgo.setMonth(sixAgo.getMonth() - 6)

    const { data } = await localDb
      .from('orders')
      .select('id, total_amount, status, created_at, client:client_id(name)')
      .gte('created_at', sixAgo.toISOString())

    const orders = (data ?? []) as unknown as AnalyticsOrderRow[]
    if (!orders.length) {
      setMonthly([])
      setByStatus([])
      setTopClients([])
      setLoading(false)
      return
    }

    const monthBuckets = buildSixMonthBuckets()
    const monthlyMap = new Map(monthBuckets.map((entry) => [`${entry.monthIdx}-${entry.year}`, entry]))

    for (const order of orders) {
      const date = new Date(order.created_at)
      const key = `${date.getMonth()}-${date.getFullYear()}`
      const bucket = monthlyMap.get(key)
      if (!bucket) continue
      bucket.revenue += order.total_amount ?? 0
      bucket.orders += 1
    }

    const statusMap: Record<string, number> = {}
    for (const order of orders) {
      statusMap[order.status] = (statusMap[order.status] ?? 0) + 1
    }

    const clientMap: Record<string, number> = {}
    for (const order of orders) {
      const name = order.client?.name ?? '-'
      clientMap[name] = (clientMap[name] ?? 0) + (order.total_amount ?? 0)
    }

    setMonthly(Array.from(monthlyMap.values()))
    setByStatus(Object.entries(statusMap).map(([status, count]) => ({ status, count })))
    setTopClients(
      Object.entries(clientMap)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([name, total]) => ({ name, total }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)

      const sixAgo = new Date()
      sixAgo.setMonth(sixAgo.getMonth() - 6)

      const { data } = await localDb
        .from('orders')
        .select('id, total_amount, status, created_at, client:client_id(name)')
        .gte('created_at', sixAgo.toISOString())

      if (cancelled) {
        return
      }

      const orders = (data ?? []) as unknown as AnalyticsOrderRow[]
      if (!orders.length) {
        setMonthly([])
        setByStatus([])
        setTopClients([])
        setLoading(false)
        return
      }

      const monthBuckets = buildSixMonthBuckets()
      const monthlyMap = new Map(monthBuckets.map((entry) => [`${entry.monthIdx}-${entry.year}`, entry]))

      for (const order of orders) {
        const date = new Date(order.created_at)
        const key = `${date.getMonth()}-${date.getFullYear()}`
        const bucket = monthlyMap.get(key)
        if (!bucket) continue
        bucket.revenue += order.total_amount ?? 0
        bucket.orders += 1
      }

      const statusMap: Record<string, number> = {}
      for (const order of orders) {
        statusMap[order.status] = (statusMap[order.status] ?? 0) + 1
      }

      const clientMap: Record<string, number> = {}
      for (const order of orders) {
        const name = order.client?.name ?? '-'
        clientMap[name] = (clientMap[name] ?? 0) + (order.total_amount ?? 0)
      }

      setMonthly(Array.from(monthlyMap.values()))
      setByStatus(Object.entries(statusMap).map(([status, count]) => ({ status, count })))
      setTopClients(
        Object.entries(clientMap)
          .sort((left, right) => right[1] - left[1])
          .slice(0, 5)
          .map(([name, total]) => ({ name, total }))
      )
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const channel = localDb
      .channel('analytics-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadAnalytics()
      })
      .subscribe()

    return () => {
      void localDb.removeChannel(channel)
    }
  }, [loadAnalytics])

  const monthlyWithLabel = monthly.map((entry) => ({
    ...entry,
    month: `${t.analytics.months[entry.monthIdx]} ${String(entry.year).slice(2)}`,
  }))

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-5 overflow-hidden animate-fade-in-up transition-colors duration-200">
      <button
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.analytics.period}</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open ? (
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {[0, 1, 2].map((index) => <Skeleton key={index} className="h-44" />)}
            </div>
          ) : monthly.length === 0 ? (
            <EmptyState
              title={t.common.noData}
              description={t.analytics.period}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-6m4 6V7m4 10v-3M5 21h14" />
                </svg>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div className="md:col-span-2">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  {t.analytics.revenue}
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={monthlyWithLabel} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  {t.analytics.byStatus}
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={byStatus.map((entry) => ({
                      ...entry,
                      label: (t.status as Record<string, string>)[entry.status] ?? entry.status,
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip formatter={(value) => [`${value} ${t.analytics.pcsUnit}`, t.analytics.ordersLabel]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {byStatus.map((entry, index) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.status] ?? '#94A3B8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {topClients.length > 0 ? (
                <div className="md:col-span-3">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                    {t.analytics.topClients}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {topClients.map((client, index) => {
                      const pct = topClients[0].total > 0 ? (client.total / topClients[0].total) * 100 : 0
                      return (
                        <div key={client.name} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 w-4 text-right shrink-0">{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{client.name}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-3">{formatCurrency(client.total)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  background: 'linear-gradient(90deg, #2563EB, #3B82F6)',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

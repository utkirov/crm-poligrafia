import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/format'
import { Skeleton } from './Skeleton'
import { useT } from '../i18n'

interface MonthData  { monthIdx: number; year: number; revenue: number; orders: number }
interface StatusData { status: string; count: number }
interface ClientData { name: string; total: number }

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6', in_progress: '#F59E0B',
  ready: '#10B981', completed: '#64748B', cancelled: '#EF4444',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload, label }: any) {
  const t = useT()
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-blue-600 dark:text-blue-400">{t.analytics.revenueLabel}: {formatCurrency(payload[0]?.value ?? 0)}</p>
      <p className="text-slate-500 dark:text-slate-400">{t.analytics.ordersLabel}: {payload[0]?.payload?.orders ?? 0}</p>
    </div>
  )
}

export function AnalyticsSection() {
  const t = useT()
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [monthly, setMonthly]       = useState<MonthData[]>([])
  const [byStatus, setByStatus]     = useState<StatusData[]>([])
  const [topClients, setTopClients] = useState<ClientData[]>([])

  useEffect(() => {
    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const sixAgo = new Date()
      sixAgo.setMonth(sixAgo.getMonth() - 6)

      const { data: orders } = await db
        .from('orders')
        .select('id, total_amount, status, created_at, client:client_id(name)')
        .gte('created_at', sixAgo.toISOString())

      if (!orders) { setLoading(false); return }

      // Monthly — store raw monthIdx + year so label can be reactive to locale
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mMap: Record<string, { revenue: number; orders: number; monthIdx: number; year: number }> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orders.forEach((o: any) => {
        const d = new Date(o.created_at)
        const key = `${d.getMonth()}-${d.getFullYear()}`
        if (!mMap[key]) mMap[key] = { revenue: 0, orders: 0, monthIdx: d.getMonth(), year: d.getFullYear() }
        mMap[key].revenue += o.total_amount ?? 0
        mMap[key].orders  += 1
      })
      setMonthly(Object.values(mMap))

      // By status
      const sMap: Record<string, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orders.forEach((o: any) => { sMap[o.status] = (sMap[o.status] ?? 0) + 1 })
      setByStatus(Object.entries(sMap).map(([status, count]) => ({ status, count })))

      // Top clients
      const cMap: Record<string, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orders.forEach((o: any) => {
        const name = o.client?.name ?? '—'
        cMap[name] = (cMap[name] ?? 0) + (o.total_amount ?? 0)
      })
      setTopClients(
        Object.entries(cMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, total]) => ({ name, total }))
      )
      setLoading(false)
    }
    load()
  }, [])

  // Build monthly data with locale-reactive labels
  const monthlyWithLabel = monthly.map((m) => ({
    ...m,
    month: `${t.analytics.months[m.monthIdx]} ${String(m.year).slice(2)}`,
  }))

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-5 overflow-hidden animate-fade-in-up transition-colors duration-200">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.analytics.period}</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              {/* Revenue area chart */}
              <div className="md:col-span-2">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  {t.analytics.revenue}
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={monthlyWithLabel} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${Math.round(v / 1000)}к`}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area
                      type="monotone" dataKey="revenue"
                      stroke="#3B82F6" strokeWidth={2}
                      fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Status bar chart */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  {t.analytics.byStatus}
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={byStatus.map((d) => ({
                      ...d,
                      label: (t.status as Record<string, string>)[d.status] ?? d.status,
                    }))} layout="vertical"
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category" dataKey="label"
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      axisLine={false} tickLine={false} width={62}
                    />
                    <Tooltip formatter={(v) => [`${v} ${t.analytics.pcsUnit}`, t.analytics.ordersLabel]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {byStatus.map((d, i) => (
                        <Cell key={i} fill={STATUS_COLORS[d.status] ?? '#94A3B8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top clients */}
              {topClients.length > 0 && (
                <div className="md:col-span-3">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                    {t.analytics.topClients}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {topClients.map((c, i) => {
                      const pct = topClients[0].total > 0 ? (c.total / topClients[0].total) * 100 : 0
                      return (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 w-4 text-right shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-3">
                                {formatCurrency(c.total)}
                              </span>
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

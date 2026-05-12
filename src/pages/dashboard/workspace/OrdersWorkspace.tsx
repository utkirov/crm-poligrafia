import type { OrderWithClient } from '../../../types'

interface OrdersWorkspaceProps {
  title: string
  orders: OrderWithClient[]
  loading: boolean
  error: string | null
}

export function OrdersWorkspace({ title, orders, loading, error }: OrdersWorkspaceProps) {
  return (
    <div className="flex-1 p-4 md:p-6">
      <h1 className="text-lg font-bold">{title}</h1>
      {loading && <p className="mt-2 text-sm text-slate-500">Loading workspace…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <p className="mt-2 text-sm text-slate-500">
          Workspace placeholder. Orders: {orders.length}
        </p>
      )}
    </div>
  )
}

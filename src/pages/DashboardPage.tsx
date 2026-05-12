import { useOrders } from '../hooks/useOrders'
import { useT } from '../i18n'
import { OrdersWorkspace } from './dashboard/workspace/OrdersWorkspace'

export function DashboardPage() {
  const t = useT()
  const { orders, loading, error } = useOrders()

  return (
    <div className="flex flex-col h-full page-enter">
      <OrdersWorkspace
        orders={orders}
        loading={loading}
        error={error}
        title={t.dashboard.title}
      />
    </div>
  )
}

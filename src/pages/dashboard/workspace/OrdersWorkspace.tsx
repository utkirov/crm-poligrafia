import type { OrderWithClient } from '../../../types'
import { WorkspaceToolbar } from './WorkspaceToolbar'

interface OrdersWorkspaceProps {
  title: string
  orders: OrderWithClient[]
  loading: boolean
  error: string | null
}

export function OrdersWorkspace({ title, orders, loading, error }: OrdersWorkspaceProps) {
  void orders

  return (
    <section data-testid="orders-workspace" className="flex-1 flex flex-col gap-4">
      <WorkspaceToolbar title={title} />
      <div className="workspace-grid min-h-[calc(100vh-180px)]">
        <aside data-testid="workspace-list-rail" className="workspace-panel rounded-[28px] p-4" />
        <div data-testid="workspace-active-canvas" className="workspace-panel rounded-[32px] p-5" />
        <aside
          data-testid="workspace-context-rail"
          className="workspace-panel rounded-[28px] p-4 xl:block hidden"
        />
      </div>
      {loading ? <div className="text-sm text-slate-500">Loading...</div> : null}
      {error ? <div className="text-sm text-red-500">{error}</div> : null}
    </section>
  )
}

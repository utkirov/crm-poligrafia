import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/Button'

interface WorkspaceToolbarProps {
  title: string
}

export function WorkspaceToolbar({ title }: WorkspaceToolbarProps) {
  const navigate = useNavigate()

  return (
    <header className="workspace-panel rounded-[28px] px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Orders Workspace</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
      </div>
      <Button size="lg" onClick={() => navigate('/orders/create')}>
        <span>+</span>
        <span>Новый заказ</span>
      </Button>
    </header>
  )
}

import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/Button'
import { useT } from '../../../i18n'

interface WorkspaceToolbarProps {
  title: string
}

export function WorkspaceToolbar({ title }: WorkspaceToolbarProps) {
  const navigate = useNavigate()
  const t = useT()

  return (
    <header className="workspace-panel rounded-[28px] px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          {t.dashboard.workspaceLabel}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{title}</h1>
      </div>
      <Button size="lg" onClick={() => navigate('/orders/create')}>
        <span>+</span>
        <span>{t.orders.newOrder}</span>
      </Button>
    </header>
  )
}

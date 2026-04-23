import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { useT } from '../i18n'

export function NotFoundPage() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <p className="text-gray-500">{t.notFound.title}</p>
      <Button onClick={() => navigate(-1)}>{t.common.back}</Button>
    </div>
  )
}

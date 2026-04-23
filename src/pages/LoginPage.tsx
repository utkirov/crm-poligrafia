import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useT } from '../i18n'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export function LoginPage() {
  const navigate = useNavigate()
  const login    = useAuthStore((s) => s.login)
  const user     = useAuthStore((s) => s.user)
  const t        = useT()

  const [loginValue, setLoginValue] = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  if (user) {
    const target = user.role === 'director' ? '/dashboard' : '/finance'
    navigate(target, { replace: true })
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!loginValue.trim() || !password.trim()) {
      setError(t.auth.fillAll)
      return
    }
    setLoading(true)
    const err = await login(loginValue.trim(), password)
    setLoading(false)
    if (err) {
      setError(t.auth.invalidCreds)
      return
    }
    const role = useAuthStore.getState().user?.role
    navigate(role === 'director' ? '/dashboard' : '/finance', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center transition-colors duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg dark:shadow-slate-900 border border-transparent dark:border-slate-700 p-8 w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.auth.title}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t.auth.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={t.auth.loginLabel}
            type="text"
            placeholder="director"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            autoComplete="username"
            autoFocus
          />
          <Input
            label={t.auth.passwordLabel}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            {t.auth.submitBtn}
          </Button>
        </form>
      </div>
    </div>
  )
}

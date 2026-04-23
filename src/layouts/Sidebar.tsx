import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useT } from '../i18n'
import { OrdersIcon, ClientsIcon, ServicesIcon, FinanceIcon, LogoutIcon } from '../components/icons'
import { NotificationBell } from '../components/NotificationBell'
import { getInitials } from '../utils/format'

interface NavItem { to: string; label: string; icon: React.ReactNode }
interface SidebarProps { onClose?: () => void }

const roleLabels: Record<string, { ru: string; uz: string }> = {
  director:  { ru: 'Директор',  uz: 'Direktor' },
  financier: { ru: 'Финансист', uz: 'Moliyachi' },
}

export function Sidebar({ onClose }: SidebarProps) {
  const user         = useAuthStore((s) => s.user)
  const logout       = useAuthStore((s) => s.logout)
  const navigate     = useNavigate()
  const t            = useT()
  const { theme, locale, toggleTheme, setLocale } = useSettingsStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const isDark = theme === 'dark'

  const directorNav: NavItem[] = [
    { to: '/dashboard',              label: t.nav.orders,        icon: <OrdersIcon /> },
    { to: '/clients',                label: t.nav.clients,       icon: <ClientsIcon /> },
    { to: '/services',               label: t.nav.services,      icon: <ServicesIcon /> },
    { to: '/finance',                label: t.nav.finance,       icon: <FinanceIcon /> },
    { to: '/analytics',              label: t.nav.analytics,     icon: <AnalyticsIcon /> },
    { to: '/settings/cancel-reasons',label: t.nav.cancelReasons, icon: <SettingsIcon /> },
  ]

  const financierNav: NavItem[] = [
    { to: '/finance', label: t.nav.finance, icon: <FinanceIcon /> },
  ]

  const navItems = user?.role === 'director' ? directorNav : financierNav
  const roleLabel = user?.role
    ? (locale === 'uz' ? roleLabels[user.role]?.uz : roleLabels[user.role]?.ru) ?? ''
    : ''

  return (
    <aside
      className="w-64 shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight tracking-tight">CRM</p>
              <p className="text-[11px] text-slate-400 font-medium">
                {t.sidebar.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                aria-label={t.sidebar.closeMenu}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {/* Search button */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all duration-150 w-full mb-1 cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1 text-left">{t.nav.search}</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-500 border border-white/[0.06] font-mono">
            ⌘K
          </kbd>
        </button>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
              boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
            } : undefined}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* ─── Appearance settings ──────────────────────── */}
      <div className="px-3 pb-2 border-t border-white/[0.06] pt-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2">
          {t.settings.appearance}
        </p>

        {/* Theme toggle */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <div className="flex items-center gap-2 text-slate-400">
            {isDark
              ? <MoonIcon />
              : <SunIcon />
            }
            <span className="text-xs font-medium">
              {isDark ? t.theme.dark : t.theme.light}
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${
              isDark ? 'bg-blue-500' : 'bg-slate-600'
            }`}
            aria-label={t.settings.theme}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
              isDark ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Language toggle */}
        <div className="flex items-center gap-1 px-2 py-1">
          <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <div className="flex gap-1 ml-auto">
            {(['ru', 'uz'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  locale === l
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {l === 'ru' ? 'RU' : "O'Z"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-2 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #475569 0%, #64748B 100%)' }}>
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[11px] text-slate-400 font-medium">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-150 cursor-pointer mt-1"
        >
          <LogoutIcon />
          {t.nav.logout}
        </button>
      </div>
    </aside>
  )
}

// ─── Inline icons ─────────────────────────────────────────────
function AnalyticsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}

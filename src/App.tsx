import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useSettingsStore, applyTheme } from './store/settingsStore'
import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './layouts/MainLayout'
import { LoginPage } from './pages/LoginPage'
import { Spinner } from './components/Spinner'

// Lazy-loaded pages for code splitting
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ClientsPage        = lazy(() => import('./pages/ClientsPage').then(m => ({ default: m.ClientsPage })))
const ClientDetailPage   = lazy(() => import('./pages/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })))
const CashbackDetailPage = lazy(() => import('./pages/CashbackDetailPage').then(m => ({ default: m.CashbackDetailPage })))
const ServicesPage       = lazy(() => import('./pages/ServicesPage').then(m => ({ default: m.ServicesPage })))
const FinancePage        = lazy(() => import('./pages/FinancePage').then(m => ({ default: m.FinancePage })))
const CancelReasonsPage  = lazy(() => import('./pages/CancelReasonsPage').then(m => ({ default: m.CancelReasonsPage })))
const LocalDataPage      = lazy(() => import('./pages/LocalDataPage').then(m => ({ default: m.LocalDataPage })))
const OrderEditPage      = lazy(() => import('./pages/OrderEditPage').then(m => ({ default: m.OrderEditPage })))
const OrderDetailPage    = lazy(() => import('./pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })))
const OrderCreatePage    = lazy(() => import('./pages/OrderCreatePage').then(m => ({ default: m.OrderCreatePage })))
const PaymentsPage       = lazy(() => import('./pages/PaymentsPage').then(m => ({ default: m.PaymentsPage })))
const AnalyticsPage      = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const UsersPage          = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })))
const UserKpiPage        = lazy(() => import('./pages/UserKpiPage').then(m => ({ default: m.UserKpiPage })))
const OrderTicketsPage   = lazy(() => import('./pages/OrderTicketsPage').then(m => ({ default: m.OrderTicketsPage })))
const OrderTicketDetailPage = lazy(() => import('./pages/OrderTicketDetailPage').then(m => ({ default: m.OrderTicketDetailPage })))
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner className="w-7 h-7 text-blue-600" />
  </div>
)

// Helper: wrap lazy page in Suspense
const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const loading    = useAuthStore((s) => s.loading)
  const theme      = useSettingsStore((s) => s.theme)

  useEffect(() => { initialize() }, [initialize])

  // Keep <html> class in sync with theme store
  useEffect(() => { applyTheme(theme) }, [theme])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* Director only */}
            <Route path="/dashboard"
              element={<ProtectedRoute allowedRoles={['director', 'manager']}><S><DashboardPage /></S></ProtectedRoute>} />
            <Route path="/orders/create"
              element={<ProtectedRoute allowedRoles={['director', 'manager']}><S><OrderCreatePage /></S></ProtectedRoute>} />
            <Route path="/orders/:id"
              element={<ProtectedRoute allowedRoles={['director', 'manager', 'designer']}><S><OrderDetailPage /></S></ProtectedRoute>} />
            <Route path="/orders/:id/edit"
              element={<ProtectedRoute allowedRoles={['director', 'manager']}><S><OrderEditPage /></S></ProtectedRoute>} />
            <Route path="/orders/:id/payments"
              element={<ProtectedRoute allowedRoles={['director', 'financier', 'manager']}><S><PaymentsPage /></S></ProtectedRoute>} />
            <Route path="/tickets"
              element={<ProtectedRoute allowedRoles={['director', 'manager', 'designer']}><S><OrderTicketsPage /></S></ProtectedRoute>} />
            <Route path="/tickets/:id"
              element={<ProtectedRoute allowedRoles={['director', 'manager', 'designer']}><S><OrderTicketDetailPage /></S></ProtectedRoute>} />
            <Route path="/clients"
              element={<ProtectedRoute allowedRoles={['director', 'manager']}><S><ClientsPage /></S></ProtectedRoute>} />
            <Route path="/clients/:id"
              element={<ProtectedRoute allowedRoles={['director', 'manager']}><S><ClientDetailPage /></S></ProtectedRoute>} />
            <Route path="/clients/:id/cashback"
              element={<ProtectedRoute allowedRoles={['director', 'manager']}><S><CashbackDetailPage /></S></ProtectedRoute>} />
            <Route path="/services"
              element={<ProtectedRoute allowedRoles={['director', 'manager']}><S><ServicesPage /></S></ProtectedRoute>} />
            <Route path="/settings/cancel-reasons"
              element={<ProtectedRoute allowedRoles={['director']}><S><CancelReasonsPage /></S></ProtectedRoute>} />
            <Route path="/settings/local-data"
              element={<ProtectedRoute allowedRoles={['director']}><S><LocalDataPage /></S></ProtectedRoute>} />

            <Route path="/analytics"
              element={<ProtectedRoute allowedRoles={['director']}><S><AnalyticsPage /></S></ProtectedRoute>} />
            <Route path="/users"
              element={<ProtectedRoute allowedRoles={['director']}><S><UsersPage /></S></ProtectedRoute>} />
            <Route path="/users/:id/kpi"
              element={<ProtectedRoute allowedRoles={['director']}><S><UserKpiPage /></S></ProtectedRoute>} />

            {/* Both roles */}
            <Route path="/finance"
              element={<ProtectedRoute allowedRoles={['director', 'financier']}><S><FinancePage /></S></ProtectedRoute>} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<S><NotFoundPage /></S>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

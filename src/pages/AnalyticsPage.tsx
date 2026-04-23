import { AnalyticsSection } from '../components/AnalyticsSection'
import { useT } from '../i18n'

export function AnalyticsPage() {
  const t = useT()
  return (
    <div className="flex flex-col min-h-full page-enter">
      {/* Topbar */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-3 transition-colors duration-200">
        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.analytics.title}</h1>
      </div>

      <div className="flex-1 p-4 md:p-6">
        <AnalyticsSection />
      </div>
    </div>
  )
}

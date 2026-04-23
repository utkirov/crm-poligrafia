import { Component, type ReactNode } from 'react'
import { useT } from '../i18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

// Functional wrapper so we can use the useT hook
function ErrorUI({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center min-h-64 p-8 text-center animate-fade-in">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{t.errorBoundary.title}</h3>
      <p className="text-sm text-slate-500 mb-5 max-w-sm">
        {message ?? t.errorBoundary.unknownError}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all duration-150 cursor-pointer active:scale-95"
      >
        {t.errorBoundary.retry}
      </button>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorUI
          message={this.state.error?.message}
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }
    return this.props.children
  }
}

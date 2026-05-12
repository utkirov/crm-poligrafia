import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm shadow-blue-200 ' +
    'hover:from-blue-700 hover:to-blue-600 hover:shadow-md hover:shadow-blue-200 ' +
    'active:scale-95 disabled:from-blue-300 disabled:to-blue-300 disabled:shadow-none',
  secondary:
    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 ' +
    'border border-slate-200 dark:border-slate-600 shadow-sm ' +
    'hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow ' +
    'active:scale-95 disabled:opacity-50 disabled:shadow-none',
  danger:
    'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-sm shadow-red-100 ' +
    'hover:from-red-700 hover:to-red-600 hover:shadow-md ' +
    'active:scale-95 disabled:from-red-300 disabled:to-red-300',
  ghost:
    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 ' +
    'active:scale-95 disabled:opacity-50',
  success:
    'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-100 ' +
    'hover:from-emerald-700 hover:to-emerald-600 hover:shadow-md ' +
    'active:scale-95 disabled:from-emerald-300 disabled:to-emerald-300',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs font-semibold rounded-xl',
  md: 'px-4 py-2.5 text-sm font-semibold rounded-xl',
  lg: 'px-6 py-3 text-sm font-semibold rounded-2xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        transition-all duration-150 cursor-pointer disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

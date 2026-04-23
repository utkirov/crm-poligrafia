import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          px-3 py-2 rounded-lg border text-sm
          text-gray-900 dark:text-slate-100
          bg-white dark:bg-slate-800
          border-gray-300 dark:border-slate-600
          placeholder:text-gray-400 dark:placeholder:text-slate-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          dark:focus:ring-blue-400
          disabled:bg-gray-50 dark:disabled:bg-slate-900
          disabled:text-gray-400 dark:disabled:text-slate-600
          transition-colors duration-150
          ${error ? 'border-red-400 dark:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

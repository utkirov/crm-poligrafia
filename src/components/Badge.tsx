import type { ReactNode } from 'react'

type Color = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'teal'

interface BadgeProps {
  color?: Color
  children: ReactNode
  className?: string
}

const colorClasses: Record<Color, string> = {
  blue:   'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700',
  green:  'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-700',
  yellow: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-700',
  red:    'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-700',
  gray:   'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600',
  purple: 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-700',
  teal:   'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-700',
}

export function Badge({ color = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  )
}

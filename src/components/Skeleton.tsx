import type { HTMLAttributes, CSSProperties } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`}
      style={style}
      {...props}
    />
  )
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex-1 min-w-[260px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2].map((j) => (
              <div key={j} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <Skeleton className="h-3 w-16 mb-3" />
                <Skeleton className="h-4 w-full mb-1.5" />
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  const widths = [48, 80, 120, 64, 72, 56, 96]
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: widths[i % widths.length] }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 flex gap-6 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-3" style={{ width: widths[(i + j + 1) % widths.length] }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 shadow-sm">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-7 w-28 mb-1.5" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

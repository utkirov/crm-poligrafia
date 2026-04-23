import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface SearchResult {
  id: string
  type: 'order' | 'client'
  title: string
  subtitle: string
  href: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60)
      setQuery('')
      setResults([])
      setActiveIdx(0)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const q = query.trim()
      const db = supabase as any

      const [ordersRes, clientsRes] = await Promise.all([
        db.from('orders').select('id, order_number, title, status').ilike('title', `%${q}%`).limit(5),
        db.from('clients').select('id, name, phone').or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(5),
      ])

      const orderResults: SearchResult[] = (ordersRes.data ?? []).map((o: any) => ({
        id: o.id, type: 'order' as const,
        title: o.title, subtitle: `Заказ #${o.order_number}`,
        href: `/orders/${o.id}`,
      }))
      const clientResults: SearchResult[] = (clientsRes.data ?? []).map((c: any) => ({
        id: c.id, type: 'client' as const,
        title: c.name, subtitle: c.phone ?? 'Клиент',
        href: `/clients/${c.id}`,
      }))

      setResults([...orderResults, ...clientResults])
      setActiveIdx(0)
      setLoading(false)
    }, 220)
    return () => clearTimeout(t)
  }, [query])

  const go = (href: string) => {
    navigate(href)
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx].href)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-transparent dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-700">
          <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Поиск заказов и клиентов..."
            className="flex-1 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-72 overflow-y-auto py-1.5">
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => go(r.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                  i === activeIdx ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  r.type === 'order'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                    : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {r.type === 'order' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{r.subtitle}</p>
                </div>
                <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">Ничего не найдено по «{query}»</p>
          </div>
        )}

        {!query && (
          <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
            Введите запрос для поиска по заказам и клиентам
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">↑↓</kbd> навигация
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">Enter</kbd> открыть
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">Esc</kbd> закрыть
          </span>
        </div>
      </div>
    </div>
  )
}

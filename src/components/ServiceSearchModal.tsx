import { useState, useMemo } from 'react'
import { Modal } from './Modal'
import { AddServiceModal } from './AddServiceModal'
import { useT } from '../i18n'
import type { ServiceWithUsage } from '../hooks/useServiceManagement'
import type { ServiceCategory, ServiceSubcategory } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  services: ServiceWithUsage[]
  categories: ServiceCategory[]
  subcategories: ServiceSubcategory[]
  /** Called when user clicks a service result — passes the subcategory id to navigate to */
  onSelectSubcat: (subcatId: string) => void
  onRefetch: () => void
}

export function ServiceSearchModal({
  open,
  onClose,
  services,
  categories,
  subcategories,
  onSelectSubcat,
  onRefetch,
}: Props) {
  const t = useT()
  const [q, setQ] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const activeServices = useMemo(() => services.filter((s) => !s.is_archived), [services])

  const filtered = useMemo(() => {
    if (!q.trim()) return activeServices.slice(0, 40)
    const lower = q.toLowerCase()
    return activeServices.filter((s) => s.name.toLowerCase().includes(lower)).slice(0, 60)
  }, [q, activeServices])

  const subcatMap = useMemo(
    () => Object.fromEntries(subcategories.map((s) => [s.id, s])),
    [subcategories]
  )
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  )

  const handleClose = () => {
    setQ('')
    onClose()
  }

  const handleServiceClick = (subcatId: string) => {
    onSelectSubcat(subcatId)
    handleClose()
  }

  const handleAdded = () => {
    setAddOpen(false)
    onRefetch()
    handleClose()
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title={t.services.searchBtn} className="max-w-lg">
        <div className="flex flex-col gap-3">
          {/* Search input */}
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.services.searchPlaceholder}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-8">
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  {t.common.notFound}
                  {q.trim() && (
                    <span className="font-medium text-slate-600 dark:text-slate-300"> «{q.trim()}»</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t.services.noResultsAdd}
                </button>
              </div>
            ) : (
              filtered.map((svc) => {
                const subcat = subcatMap[svc.subcategory_id]
                const cat   = subcat ? catMap[subcat.category_id] : null
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleServiceClick(svc.subcategory_id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer text-left group"
                  >
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 flex items-center justify-center shrink-0 transition-colors">
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>

                    {/* Name + breadcrumb */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-700 truncate">
                        {svc.name}
                      </p>
                      {(cat || subcat) && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {cat?.name}{subcat ? ` › ${subcat.name}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Unit + price */}
                    <div className="text-right shrink-0">
                      {svc.price_per_unit > 0 && (
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {svc.price_per_unit.toLocaleString('ru-RU')}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {svc.unit_of_measure}
                      </p>
                    </div>

                    <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              {t.stepOrder.shownOf} {filtered.length} {t.stepOrder.outOf} {activeServices.length} {t.stepOrder.servicesCountUnit}
            </p>
          )}
        </div>
      </Modal>

      <AddServiceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleAdded}
        categories={categories}
        subcategories={subcategories}
        initialName={q.trim()}
      />
    </>
  )
}

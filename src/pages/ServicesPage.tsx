import { useState } from 'react'
import { useServiceManagement } from '../hooks/useServiceManagement'
import { CategoryTree } from './services/CategoryTree'
import { ServicesList } from './services/ServicesList'
import { ServiceSearchModal } from '../components/ServiceSearchModal'
import { AddServiceModal } from '../components/AddServiceModal'
import { Spinner } from '../components/Spinner'
import { useT } from '../i18n'

export function ServicesPage() {
  const t = useT()
  const { categories, subcategories, services, loading, refetch } = useServiceManagement()
  const [selectedSubcatId, setSelectedSubcatId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const selectedSubcat = subcategories.find((s) => s.id === selectedSubcatId) ?? null
  const selectedCat = selectedSubcat
    ? categories.find((c) => c.id === selectedSubcat.category_id) ?? null
    : null

  return (
    <div className="flex flex-col min-h-full page-enter">
      {/* Topbar */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors duration-200 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.services.title}</h1>

        <div className="flex items-center gap-2">
          {/* Search button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t.services.searchBtn}
          </button>

          {/* Add service button */}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.services.addService}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner className="w-8 h-8 text-blue-600" />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <CategoryTree
            categories={categories}
            subcategories={subcategories}
            selectedSubcatId={selectedSubcatId}
            onSelectSubcat={setSelectedSubcatId}
            search={search}
            onSearchChange={setSearch}
            onRefetch={refetch}
          />
          <ServicesList
            subcategory={selectedSubcat}
            category={selectedCat}
            services={services}
            search={search}
            onRefetch={refetch}
          />
        </div>
      )}

      {/* Search modal */}
      <ServiceSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        services={services}
        categories={categories}
        subcategories={subcategories}
        onSelectSubcat={(id) => setSelectedSubcatId(id)}
        onRefetch={refetch}
      />

      {/* Add service modal */}
      <AddServiceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { refetch(); setAddOpen(false) }}
        categories={categories}
        subcategories={subcategories}
      />
    </div>
  )
}

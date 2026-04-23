import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/Modal'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useT } from '../../i18n'
import type { CategoryWithCount, SubcategoryWithCount } from '../../hooks/useServiceManagement'

interface Props {
  categories: CategoryWithCount[]
  subcategories: SubcategoryWithCount[]
  selectedSubcatId: string | null
  onSelectSubcat: (id: string) => void
  search: string
  onSearchChange: (v: string) => void
  onRefetch: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function CategoryTree({
  categories, subcategories, selectedSubcatId,
  onSelectSubcat, search, onSearchChange, onRefetch,
}: Props) {
  const t = useT()
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newSubcatCatId, setNewSubcatCatId] = useState<string | null>(null)
  const [newSubcatName, setNewSubcatName] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setSaving(true)
    await db.from('service_categories').insert({ name: newCatName.trim(), icon: '📦' })
    setNewCatName(''); setNewCatOpen(false); setSaving(false); onRefetch()
  }

  const handleCreateSubcat = async () => {
    if (!newSubcatName.trim() || !newSubcatCatId) return
    setSaving(true)
    await db.from('service_subcategories').insert({ category_id: newSubcatCatId, name: newSubcatName.trim() })
    setNewSubcatName(''); setNewSubcatCatId(null); setSaving(false); onRefetch()
  }

  const filteredCats = search
    ? categories.filter((cat) => {
        const catSubs = subcategories.filter((s) => s.category_id === cat.id)
        return cat.name.toLowerCase().includes(search.toLowerCase()) ||
          catSubs.some((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      })
    : categories

  return (
    <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col transition-colors duration-200">
      {/* Search + add category */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-2">
        <input
          type="text"
          placeholder={t.common.search}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button size="sm" variant="secondary" onClick={() => setNewCatOpen(true)} className="w-full">
          + {t.services.addCategory}
        </Button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCats.map((cat) => {
          const catSubs = subcategories.filter((s) => s.category_id === cat.id)
          const isExpanded = expandedCats.has(cat.id) || Boolean(search)
          const filteredSubs = search
            ? catSubs.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
            : catSubs

          return (
            <div key={cat.id} className="mb-1">
              {/* Category row */}
              <div
                onClick={() => toggleCat(cat.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
              >
                <span className="text-base">{cat.icon ?? '📦'}</span>
                <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{cat.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{cat.totalServices}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setNewSubcatCatId(cat.id); setNewSubcatName('') }}
                  className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 text-lg leading-none cursor-pointer w-5 shrink-0"
                  title={t.services.addSubcategory}
                >
                  +
                </button>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Subcategories */}
              {isExpanded && filteredSubs.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onSelectSubcat(sub.id)}
                  className={`flex items-center gap-2 pl-8 pr-3 py-2 ml-1 rounded-lg cursor-pointer transition-colors group ${
                    selectedSubcatId === sub.id
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${selectedSubcatId === sub.id ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span className={`flex-1 text-sm truncate ${
                    selectedSubcatId === sub.id
                      ? 'text-blue-700 dark:text-blue-400 font-medium'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {sub.name}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{sub.serviceCount}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectSubcat(sub.id) }}
                    className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 text-lg leading-none cursor-pointer w-5 shrink-0"
                    title={t.services.addService}
                  >
                    +
                  </button>
                </div>
              ))}

              {/* New subcat inline form */}
              {newSubcatCatId === cat.id && (
                <div className="pl-8 pr-3 py-2 flex gap-2">
                  <input
                    autoFocus
                    value={newSubcatName}
                    onChange={(e) => setNewSubcatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubcat(); if (e.key === 'Escape') setNewSubcatCatId(null) }}
                    placeholder={t.services.subcategoryName}
                    className="flex-1 px-2 py-1 border border-blue-300 dark:border-blue-600 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={handleCreateSubcat} disabled={saving || !newSubcatName.trim()} className="text-blue-600 dark:text-blue-400 text-xs font-medium cursor-pointer hover:underline">
                    ОК
                  </button>
                  <button onClick={() => setNewSubcatCatId(null)} className="text-slate-400 text-xs cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filteredCats.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-600 text-center py-8">{t.services.noCategories}</p>
        )}
      </div>

      {/* New category modal */}
      <Modal open={newCatOpen} onClose={() => setNewCatOpen(false)} title={t.services.newCategory} className="max-w-sm">
        <div className="flex flex-col gap-4">
          <Input
            label={t.services.categoryName}
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder={t.services.categoryPlaceholder}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewCatOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreateCategory} loading={saving} disabled={!newCatName.trim()}>{t.common.create}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/Modal'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useT } from '../../i18n'
import { formatCurrency } from '../../utils/format'
import { PriceInput } from '../../components/PriceInput'
import { formatPriceInput, parsePriceInput } from '../../utils/priceInput'
import type { ServiceWithUsage } from '../../hooks/useServiceManagement'
import type { ServiceCategory, ServiceSubcategory } from '../../types'

interface Props {
  subcategory: ServiceSubcategory | null
  category: ServiceCategory | null
  services: ServiceWithUsage[]
  search: string
  onRefetch: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function ServicesList({ subcategory, category, services, search, onRefetch }: Props) {
  const t = useT()

  const units = [
    t.services.unitPcs,
    t.services.unitSqM,
    t.services.unitM,
    t.services.unitSheet,
    t.services.unitKg,
    t.services.unitPair,
    t.services.unitSet,
  ]

  const [newName, setNewName]   = useState('')
  const [adding, setAdding]     = useState(false)
  const [editService, setEditService]   = useState<ServiceWithUsage | null>(null)
  const [editName, setEditName]         = useState('')
  const [editUnit, setEditUnit]         = useState('')
  const [editPrice, setEditPrice]       = useState('')
  const [editSubcatName, setEditSubcatName]   = useState(subcategory?.name ?? '')
  const [editSubcatOpen, setEditSubcatOpen]   = useState(false)
  const [saving, setSaving]     = useState(false)

  if (!subcategory) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm">{t.services.selectSubcategoryHint}</p>
        </div>
      </div>
    )
  }

  const filtered = services.filter((s) =>
    s.subcategory_id === subcategory.id &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  )
  const active   = filtered.filter((s) => !s.is_archived)
  const archived = filtered.filter((s) => s.is_archived)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await db.from('services').insert({
      subcategory_id: subcategory.id,
      name: newName.trim(),
      is_archived: false,
      unit_of_measure: t.services.unitPcs,
      price_per_unit: 0,
    })
    setNewName(''); setAdding(false); onRefetch()
  }

  const handleArchive = async (s: ServiceWithUsage) => {
    await db.from('services').update({ is_archived: true }).eq('id', s.id)
    onRefetch()
  }

  const handleRestore = async (s: ServiceWithUsage) => {
    await db.from('services').update({ is_archived: false }).eq('id', s.id)
    onRefetch()
  }

  const openEdit = (svc: ServiceWithUsage) => {
    setEditService(svc)
    setEditName(svc.name)
    setEditUnit(svc.unit_of_measure ?? t.services.unitPcs)
    setEditPrice(formatPriceInput(svc.price_per_unit ?? 0))
  }

  const handleEditSave = async () => {
    if (!editService || !editName.trim()) return
    setSaving(true)
    await db.from('services').update({
      name: editName.trim(),
      unit_of_measure: editUnit,
      price_per_unit: parsePriceInput(editPrice),
    }).eq('id', editService.id)
    setSaving(false); setEditService(null); onRefetch()
  }

  const handleEditSubcat = async () => {
    if (!editSubcatName.trim()) return
    setSaving(true)
    await db.from('service_subcategories').update({ name: editSubcatName.trim() }).eq('id', subcategory.id)
    setSaving(false); setEditSubcatOpen(false); onRefetch()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-0.5">
            <span>{category?.name ?? '—'}</span>
            <span className="text-slate-300 dark:text-slate-600">→</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{subcategory.name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span>{active.length} {t.common.active.toLowerCase()}</span>
            {archived.length > 0 && <span>{archived.length} {t.common.archived.toLowerCase()}</span>}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setEditSubcatName(subcategory.name); setEditSubcatOpen(true) }}
        >
          {t.services.editSubcategory}
        </Button>
      </div>

      {/* Services list */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/50 transition-colors duration-200">
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600">
              <p className="text-sm">{t.services.noServices}{search ? ` ${t.common.notFound.toLowerCase()}` : ''}</p>
            </div>
          )}

          {filtered.map((svc) => (
            <div
              key={svc.id}
              className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4 transition-opacity ${
                svc.is_archived ? 'opacity-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{svc.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs ${svc.is_archived ? 'text-slate-400 dark:text-slate-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {svc.is_archived ? t.common.archived : t.common.active}
                  </span>
                  {/* unit + price */}
                  {svc.unit_of_measure && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {svc.price_per_unit > 0
                        ? `${formatCurrency(svc.price_per_unit)} / ${svc.unit_of_measure}`
                        : svc.unit_of_measure}
                    </span>
                  )}
                  {svc.usageCount > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {t.services.usedTimes} {svc.usageCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!svc.is_archived ? (
                  <>
                    <button
                      onClick={() => openEdit(svc)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {t.common.edit}
                    </button>
                    <button
                      onClick={() => handleArchive(svc)}
                      className="text-xs text-red-500 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      {t.common.archive}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRestore(svc)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {t.common.restore}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick add row */}
        <div className="mt-4 flex gap-3 items-end">
          <Input
            label=""
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder={t.services.newServicePlaceholder}
            className="flex-1"
          />
          <Button onClick={handleAdd} loading={adding} disabled={!newName.trim()}>
            + {t.common.add}
          </Button>
        </div>
      </div>

      {/* Edit service modal */}
      <Modal open={Boolean(editService)} onClose={() => setEditService(null)} title={t.services.editService} className="max-w-sm">
        <div className="flex flex-col gap-4">
          <Input
            label={t.common.name}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />

          {/* Unit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.services.unitLabel}</label>
            <select
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Price */}
          <PriceInput
            label={`${t.services.pricePerUnitLabel} (${editUnit})`}
            value={editPrice}
            onChange={setEditPrice}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditService(null)}>{t.common.cancel}</Button>
            <Button onClick={handleEditSave} loading={saving} disabled={!editName.trim()}>{t.common.save}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit subcategory modal */}
      <Modal open={editSubcatOpen} onClose={() => setEditSubcatOpen(false)} title={t.services.editSubcategoryTitle} className="max-w-sm">
        <div className="flex flex-col gap-4">
          <Input
            label={t.common.name}
            value={editSubcatName}
            onChange={(e) => setEditSubcatName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditSubcatOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleEditSubcat} loading={saving} disabled={!editSubcatName.trim()}>{t.common.save}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

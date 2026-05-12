import { useState } from 'react'
import { localDb } from '../lib/localDb'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'
import { PriceInput } from './PriceInput'
import { formatPriceInput, parsePriceInput } from '../utils/priceInput'
import { useT } from '../i18n'
import type { ServiceCategory, ServiceSubcategory } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  categories: ServiceCategory[]
  subcategories: ServiceSubcategory[]
  /** pre-fill name from a failed search */
  initialName?: string
}

const NEW_ID = '__new__'

export function AddServiceModal({ open, onClose, onSaved, categories, subcategories, initialName = '' }: Props) {
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

  // category
  const [catId, setCatId]         = useState('')
  const [newCatName, setNewCatName] = useState('')

  // subcategory
  const [subcatId, setSubcatId]       = useState('')
  const [newSubcatName, setNewSubcatName] = useState('')

  // service
  const [name, setName]           = useState(initialName)
  const [unit, setUnit]           = useState(t.services.unitPcs)
  const [price, setPrice]         = useState(formatPriceInput(0))
  const [saving, setSaving]       = useState(false)

  const filteredSubs = subcategories.filter((s) => {
    if (catId === NEW_ID) return false
    return s.category_id === catId
  })

  const isCreatingCat    = catId === NEW_ID
  const isCreatingSubcat = subcatId === NEW_ID

  const canSave =
    name.trim() &&
    (isCreatingCat ? newCatName.trim() : catId) &&
    (isCreatingSubcat ? newSubcatName.trim() : subcatId)

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)

    // 1. Resolve category
    let resolvedCatId = catId
    if (isCreatingCat) {
      const { data } = await localDb
        .from('service_categories')
        .insert({ name: newCatName.trim(), icon: '📦' })
        .select()
        .single()
      resolvedCatId = (data as { id: string } | null)?.id ?? resolvedCatId
    }

    // 2. Resolve subcategory
    let resolvedSubcatId = subcatId
    if (isCreatingSubcat) {
      const { data } = await localDb
        .from('service_subcategories')
        .insert({ category_id: resolvedCatId, name: newSubcatName.trim() })
        .select()
        .single()
      resolvedSubcatId = (data as { id: string } | null)?.id ?? resolvedSubcatId
    }

    // 3. Create service
    await localDb.from('services').insert({
      subcategory_id: resolvedSubcatId,
      name: name.trim(),
      unit_of_measure: unit,
      price_per_unit: parsePriceInput(price),
      is_archived: false,
    })

    setSaving(false)
    handleClose()
    onSaved()
  }

  const handleClose = () => {
    setCatId(''); setNewCatName('')
    setSubcatId(''); setNewSubcatName('')
    setName(initialName); setUnit(t.services.unitPcs); setPrice('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={t.services.addServiceTitle} className="max-w-md">
      <div className="flex flex-col gap-4">

        {/* в”Ђв”Ђ Category в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.stepOrder.categoryLabel} <span className="text-red-500">*</span>
          </label>
          <select
            value={catId}
            onChange={(e) => { setCatId(e.target.value); setSubcatId('') }}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">{t.stepOrder.selectPlaceholder}</option>
            <option value={NEW_ID}>{t.services.createNewCategory}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {isCreatingCat && (
            <input
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={t.services.newCategoryPlaceholder}
              className="px-3 py-2 border border-blue-400 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* в”Ђв”Ђ Subcategory в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.stepOrder.subcategoryLabel} <span className="text-red-500">*</span>
          </label>
          <select
            value={subcatId}
            onChange={(e) => setSubcatId(e.target.value)}
            disabled={!catId}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <option value="">{t.stepOrder.selectPlaceholder}</option>
            {!isCreatingCat && <option value={NEW_ID}>{t.services.createNewSubcategory}</option>}
            {filteredSubs.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {isCreatingSubcat && (
            <input
              autoFocus
              value={newSubcatName}
              onChange={(e) => setNewSubcatName(e.target.value)}
              placeholder={t.services.newSubcategoryPlaceholder}
              className="px-3 py-2 border border-blue-400 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* в”Ђв”Ђ Service name в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
        <Input
          label={`${t.services.addServiceTitle} вЂ” ${t.common.name} *`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.services.newServicePlaceholder}
        />

        {/* в”Ђв”Ђ Unit + Price в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.services.unitLabel}</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <PriceInput
            label={`${t.services.pricePerUnitLabel} (${unit})`}
            value={price}
            onChange={setPrice}
            placeholder="0"
          />
        </div>

        {/* в”Ђв”Ђ Actions в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose}>{t.common.cancel}</Button>
          <Button onClick={handleSave} loading={saving} disabled={!canSave}>
            {t.common.create}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

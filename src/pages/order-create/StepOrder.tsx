import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useServiceTree } from '../../hooks/useServiceTree'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { PriceInput } from '../../components/PriceInput'
import { formatCurrency } from '../../utils/format'
import { formatPriceInput, parsePriceInput } from '../../utils/priceInput'
import { useT } from '../../i18n'
import type { OrderFormState, OrderItemDraft } from './types'
import type { OrderPriority, Service } from '../../types'

interface Props {
  form: OrderFormState
  onChange: (patch: Partial<OrderFormState>) => void
}

// ─── Service search modal ─────────────────────────────────────
interface ServiceSearchModalProps {
  services: import('../../types').Service[]
  subcategories: import('../../types').ServiceSubcategory[]
  categories: import('../../types').ServiceCategory[]
  onSelect: (svc: Service, categoryId: string, subcategoryId: string) => void
  onClose: () => void
}

function ServiceSearchModal({ services, subcategories, categories, onSelect, onClose }: ServiceSearchModalProps) {
  const t = useT()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    if (!q.trim()) return services.slice(0, 30)
    const lower = q.toLowerCase()
    return services.filter((s) => s.name.toLowerCase().includes(lower)).slice(0, 40)
  }, [q, services])

  const subcatMap = useMemo(() =>
    Object.fromEntries(subcategories.map((s) => [s.id, s])), [subcategories])
  const catMap = useMemo(() =>
    Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  return (
    <Modal open onClose={onClose} title={t.stepOrder.searchTitle} className="max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.stepOrder.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >✕</button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">{t.stepOrder.noServices}</p>
          )}
          {filtered.map((svc) => {
            const subcat = subcatMap[svc.subcategory_id]
            const cat = subcat ? catMap[subcat.category_id] : null
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => onSelect(svc, subcat?.category_id ?? '', svc.subcategory_id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 group-hover:text-blue-700 truncate">{svc.name}</p>
                  {(cat || subcat) && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {cat?.name}{subcat ? ` › ${subcat.name}` : ''}
                    </p>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 text-center">
          {t.stepOrder.shownOf} {filtered.length} {t.stepOrder.outOf} {services.length} {t.stepOrder.servicesCountUnit}
        </p>
      </div>
    </Modal>
  )
}

// ─── Simple combobox ─────────────────────────────────────────
function ServiceCombobox({
  options,
  value,
  onChange,
  placeholder = '',
  disabled,
  label,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  label?: string
}) {
  const t = useT()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!q) return options
    const lower = q.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(lower))
  }, [q, options])

  const selected = options.find((o) => o.value === value)

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
    setQ('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQ(e.target.value)
    setOpen(true)
    if (!e.target.value) onChange('')
  }

  return (
    <div className="flex flex-col gap-1 relative">
      {label && <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={open ? q : (selected?.label ?? '')}
          onChange={handleInputChange}
          onFocus={() => { setOpen(true); setQ('') }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 cursor-pointer"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▼</span>
      </div>
      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">{t.common.notFound}</p>
          )}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => handleSelect(o.value)}
              className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                o.value === value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 font-medium' : 'text-gray-900 dark:text-slate-100'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main step ────────────────────────────────────────────────
export function StepOrder({ form, onChange }: Props) {
  const t = useT()
  const { categories, subcategories, services, loading } = useServiceTree()

  const [selCategory, setSelCategory] = useState('')
  const [selSubcat, setSelSubcat] = useState('')
  const [selService, setSelService] = useState('')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [manualTotal, setManualTotal] = useState('')

  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newSvcName, setNewSvcName] = useState('')
  const [newSvcCat, setNewSvcCat] = useState('')
  const [newSvcSubcat, setNewSvcSubcat] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const filteredSubcats   = subcategories.filter((s) => s.category_id === selCategory)
  const filteredServices  = services.filter((s) => s.subcategory_id === selSubcat)

  const autoTotal    = qty && price ? formatPriceInput(parsePriceInput(qty) * parsePriceInput(price)) : ''
  const isAutoTotal  = Boolean(qty && price)
  const displayTotal = isAutoTotal ? autoTotal : manualTotal

  const itemsTotal = form.orderItems.reduce((s, i) => s + parsePriceInput(i.totalPrice), 0)

  const selectedServiceObj  = filteredServices.find((s) => s.id === selService) ?? null
  const selectedServiceName = selectedServiceObj?.name ?? ''

  /** Select a service and auto-fill price from its price_per_unit */
  const selectService = (id: string) => {
    setSelService(id)
    if (id) {
      const svc = services.find((s) => s.id === id)
      if (svc && svc.price_per_unit > 0) setPrice(formatPriceInput(svc.price_per_unit))
      else setPrice('')
    } else {
      setPrice('')
    }
  }

  const handleAddItem = () => {
    if (!selService || !displayTotal) return
    const svc = services.find((s) => s.id === selService)
    if (!svc) return
    const item: OrderItemDraft = {
      id: crypto.randomUUID(),
      serviceId: selService,
      serviceName: svc.name,
      quantity: qty,
      pricePerUnit: price,
      totalPrice: displayTotal,
      isAutoTotal,
    }
    const newItems = [...form.orderItems, item]
    onChange({
      orderItems: newItems,
      totalAmount: newItems.reduce((s, i) => s + parsePriceInput(i.totalPrice), 0).toString(),
    })
    setSelService(''); setQty(''); setPrice(''); setManualTotal('')
  }

  const handleRemoveItem = (id: string) => {
    const newItems = form.orderItems.filter((i) => i.id !== id)
    onChange({
      orderItems: newItems,
      totalAmount: newItems.reduce((s, i) => s + parsePriceInput(i.totalPrice), 0).toString(),
    })
  }

  const handleServiceFromSearch = (svc: import('../../types').Service, categoryId: string, subcategoryId: string) => {
    setSelCategory(categoryId)
    setSelSubcat(subcategoryId)
    setSelService(svc.id)
    if (svc.price_per_unit > 0) setPrice(formatPriceInput(svc.price_per_unit))
    setSearchModalOpen(false)
  }

  const handleCreateService = async () => {
    if (!newSvcName.trim() || !newSvcSubcat) return
    setSavingNew(true)
    const { data } = await db.from('services').insert({
      subcategory_id: newSvcSubcat,
      name: newSvcName.trim(),
      is_archived: false,
    }).select().single()

    if (data) {
      const item: OrderItemDraft = {
        id: crypto.randomUUID(),
        serviceId: data.id,
        serviceName: data.name,
        quantity: '',
        pricePerUnit: '',
        totalPrice: '',
        isAutoTotal: false,
      }
      const newItems = [...form.orderItems, item]
      onChange({ orderItems: newItems })
    }
    setNewModalOpen(false)
    setNewSvcName(''); setNewSvcCat(''); setNewSvcSubcat('')
    setSavingNew(false)
    window.location.reload()
  }

  const catOptions    = categories.map((c) => ({ value: c.id, label: c.name }))
  const subcatOptions = filteredSubcats.map((s) => ({ value: s.id, label: s.name }))
  const svcOptions    = filteredServices.map((s) => ({ value: s.id, label: s.name }))

  const newModalCatOptions    = categories.map((c) => ({ value: c.id, label: c.name }))
  const newModalSubcatOptions = subcategories
    .filter((s) => s.category_id === newSvcCat)
    .map((s) => ({ value: s.id, label: s.name }))

  const canAdd = selService && displayTotal

  return (
    <div className="flex flex-col gap-6">
      {/* Basic fields */}
      <div className="flex flex-col gap-4">
        <Input
          label={t.stepOrder.orderTitleLabel}
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t.stepOrder.orderTitlePlaceholder}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t.common.description}</label>
          <textarea
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={2}
            placeholder={t.stepOrder.descriptionPlaceholder}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Services */}
      <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t.orders.services}</h3>
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t.stepOrder.searchTitle}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">{t.common.loading}</p>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {/* Cascading selectors */}
            <div className="grid grid-cols-3 gap-3">
              <ServiceCombobox
                label={t.stepOrder.categoryLabel}
                options={catOptions}
                value={selCategory}
                placeholder={t.stepOrder.categoryLabel + '...'}
                onChange={(v) => { setSelCategory(v); setSelSubcat(''); setSelService('') }}
              />
              <ServiceCombobox
                label={t.stepOrder.subcategoryLabel}
                options={subcatOptions}
                value={selSubcat}
                placeholder={t.stepOrder.subcategoryLabel + '...'}
                disabled={!selCategory}
                onChange={(v) => { setSelSubcat(v); setSelService('') }}
              />
              <ServiceCombobox
                label={t.stepOrder.serviceLabel}
                options={svcOptions}
                value={selService}
                placeholder={t.stepOrder.serviceLabel + '...'}
                disabled={!selSubcat}
                onChange={selectService}
              />
            </div>

            {/* Selected service preview */}
            {selectedServiceName && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium flex-1">{selectedServiceName}</span>
                {selectedServiceObj?.unit_of_measure && (
                  <span className="text-blue-400 dark:text-blue-500">
                    {t.services.priceHint} {selectedServiceObj.unit_of_measure}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 items-end">
              <Input
                label={t.stepOrder.quantityLabel}
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="100"
              />
              <PriceInput
                label={selectedServiceObj?.unit_of_measure
                  ? `${t.stepOrder.pricePerUnitLabel} (${selectedServiceObj.unit_of_measure})`
                  : t.stepOrder.pricePerUnitLabel}
                value={price}
                onChange={setPrice}
                placeholder="5 000"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t.common.total} {isAutoTotal && <span className="text-xs text-gray-400 font-normal">{t.stepOrder.autoLabel}</span>}
                </label>
                <PriceInput
                  value={displayTotal}
                  onChange={(v) => !isAutoTotal && setManualTotal(v)}
                  readOnly={isAutoTotal}
                  placeholder={t.stepOrder.autoPlaceholder}
                />
              </div>
              <Button onClick={handleAddItem} disabled={!canAdd}>
                {t.stepOrder.addItemBtn}
              </Button>
            </div>
          </div>
        )}

        {/* Items table */}
        {form.orderItems.length > 0 && (
          <div className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden mb-3">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr className="text-xs text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-3 py-2.5">{t.stepOrder.serviceLabel}</th>
                  <th className="text-right px-3 py-2.5">{t.orderDetail.colQty}</th>
                  <th className="text-right px-3 py-2.5">{t.orderDetail.colPrice}</th>
                  <th className="text-right px-3 py-2.5">{t.common.amount}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                {form.orderItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2.5 text-gray-900 dark:text-slate-100 font-medium">{item.serviceName}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500 dark:text-slate-400">{item.quantity || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500 dark:text-slate-400">
                      {item.pricePerUnit ? formatCurrency(parsePriceInput(item.pricePerUnit)) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900 dark:text-slate-100">
                      {formatCurrency(parseFloat(item.totalPrice))}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-600 cursor-pointer font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition-colors ml-auto"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-slate-800">
                <tr className="border-t border-gray-200 dark:border-slate-700">
                  <td colSpan={3} className="px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300">{t.common.total}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-gray-900 dark:text-slate-100">{formatCurrency(itemsTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {form.orderItems.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-6 text-center mb-3">
            <p className="text-sm text-gray-400">{t.stepOrder.noItemsHint}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="text-sm text-blue-600 hover:underline cursor-pointer"
        >
          {t.stepOrder.addNewService}
        </button>
      </div>

      {/* Parameters */}
      <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">{t.stepOrder.orderParamsTitle}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t.common.deadline}
            type="date"
            value={form.deadline}
            onChange={(e) => onChange({ deadline: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">{t.common.priority}</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as OrderPriority[]).map((p) => (
                <button
                  key={p} type="button"
                  onClick={() => onChange({ priority: p })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border flex-1 ${
                    form.priority === p
                      ? p === 'low' ? 'bg-green-600 text-white border-green-600'
                        : p === 'medium' ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-red-600 text-white border-red-600'
                      : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                >
                  {t.priority[p as OrderPriority]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ isUrgent: !form.isUrgent })}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.isUrgent ? 'bg-red-500' : 'bg-gray-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isUrgent ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{t.stepOrder.urgentOrderLabel}</span>
          {form.isUrgent && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              {t.common.urgent}
            </span>
          )}
        </div>
      </div>

      {/* Service search modal */}
      {searchModalOpen && (
        <ServiceSearchModal
          services={services}
          subcategories={subcategories}
          categories={categories}
          onSelect={handleServiceFromSearch}
          onClose={() => setSearchModalOpen(false)}
        />
      )}

      {/* New service modal */}
      <Modal open={newModalOpen} onClose={() => setNewModalOpen(false)} title={t.stepOrder.newServiceTitle} className="max-w-md">
        <div className="flex flex-col gap-4">
          <Input
            label={t.stepOrder.serviceNameLabel}
            value={newSvcName}
            onChange={(e) => setNewSvcName(e.target.value)}
            placeholder={t.stepOrder.searchPlaceholder}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t.stepOrder.categoryLabel} *</label>
            <select
              value={newSvcCat}
              onChange={(e) => { setNewSvcCat(e.target.value); setNewSvcSubcat('') }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.stepOrder.selectPlaceholder}</option>
              {newModalCatOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t.stepOrder.subcategoryLabel} *</label>
            <select
              value={newSvcSubcat}
              onChange={(e) => setNewSvcSubcat(e.target.value)}
              disabled={!newSvcCat}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            >
              <option value="">{t.stepOrder.selectPlaceholder}</option>
              {newModalSubcatOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewModalOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreateService} loading={savingNew} disabled={!newSvcName.trim() || !newSvcSubcat}>
              {t.stepOrder.createAndAddBtn}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { localDb } from '../../lib/localDb'
import { useServiceTree } from '../../hooks/useServiceTree'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { PriceInput } from '../../components/PriceInput'
import { formatCurrency } from '../../utils/format'
import { formatPriceInput, parsePriceInput } from '../../utils/priceInput'
import { useT } from '../../i18n'
import type { OrderFormState, OrderItemDraft } from './types'
import type { OrderPriority, Service, ServiceCategory, ServiceSubcategory } from '../../types'

interface Props {
  form: OrderFormState
  onChange: (patch: Partial<OrderFormState>) => void
}

interface ServiceSearchModalProps {
  services: Service[]
  subcategories: ServiceSubcategory[]
  categories: ServiceCategory[]
  onSelect: (service: Service) => void
  onClose: () => void
}

function sumOrderItems(items: OrderItemDraft[]) {
  return items.reduce((sum, item) => sum + parsePriceInput(item.totalPrice), 0)
}

function recalculateItem(item: OrderItemDraft): OrderItemDraft {
  const quantity = Number(item.quantity || 0)
  const pricePerUnit = parsePriceInput(item.pricePerUnit)
  const total = quantity > 0 && pricePerUnit > 0 ? quantity * pricePerUnit : 0

  return {
    ...item,
    totalPrice: total > 0 ? formatPriceInput(total) : '',
    isAutoTotal: true,
  }
}

function ServiceSearchModal({
  services,
  subcategories,
  categories,
  onSelect,
  onClose,
}: ServiceSearchModalProps) {
  const t = useT()
  const [query, setQuery] = useState('')

  const subcategoryMap = useMemo(
    () => Object.fromEntries(subcategories.map((subcategory) => [subcategory.id, subcategory])),
    [subcategories],
  )

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  )

  const filteredServices = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase()

    if (!trimmedQuery) {
      return services.slice(0, 30)
    }

    return services
      .filter((service) => {
        const subcategory = subcategoryMap[service.subcategory_id]
        const category = subcategory ? categoryMap[subcategory.category_id] : null
        const haystack = [
          service.name,
          subcategory?.name ?? '',
          category?.name ?? '',
        ].join(' ').toLowerCase()

        return haystack.includes(trimmedQuery)
      })
      .slice(0, 40)
  }, [categoryMap, query, services, subcategoryMap])

  return (
    <Modal open onClose={onClose} title={t.stepOrder.searchTitle} className="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.stepOrder.searchPlaceholder}
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label={t.common.close}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {filteredServices.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              {t.stepOrder.noServices}
            </p>
          ) : (
            filteredServices.map((service) => {
              const subcategory = subcategoryMap[service.subcategory_id]
              const category = subcategory ? categoryMap[subcategory.category_id] : null

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => onSelect(service)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{service.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {[category?.name, subcategory?.name].filter(Boolean).join(' / ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {service.price_per_unit > 0 ? formatCurrency(service.price_per_unit) : '-'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{service.unit_of_measure}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          {t.stepOrder.shownOf} {filteredServices.length} {t.stepOrder.outOf} {services.length} {t.stepOrder.servicesCountUnit}
        </p>
      </div>
    </Modal>
  )
}

export function StepOrder({ form, onChange }: Props) {
  const t = useT()
  const { categories, subcategories, services, loading } = useServiceTree()

  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newSvcName, setNewSvcName] = useState('')
  const [newSvcCat, setNewSvcCat] = useState('')
  const [newSvcSubcat, setNewSvcSubcat] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  )

  const subcategoryMap = useMemo(
    () => Object.fromEntries(subcategories.map((subcategory) => [subcategory.id, subcategory])),
    [subcategories],
  )

  const itemsTotal = useMemo(() => sumOrderItems(form.orderItems), [form.orderItems])

  const updateOrderItems = (items: OrderItemDraft[]) => {
    onChange({
      orderItems: items,
      totalAmount: String(sumOrderItems(items)),
    })
  }

  const handleServiceSelected = (service: Service) => {
    const subcategory = subcategoryMap[service.subcategory_id]
    const category = subcategory ? categoryMap[subcategory.category_id] : null

    const newItem = recalculateItem({
      id: crypto.randomUUID(),
      serviceId: service.id,
      serviceName: service.name,
      categoryName: category?.name ?? '',
      subcategoryName: subcategory?.name ?? '',
      unitLabel: service.unit_of_measure,
      quantity: '1',
      pricePerUnit: service.price_per_unit > 0 ? formatPriceInput(service.price_per_unit) : '',
      totalPrice: '',
      isAutoTotal: true,
    })

    updateOrderItems([...form.orderItems, newItem])
    setSearchModalOpen(false)
  }

  const handleItemChange = (
    itemId: string,
    field: 'quantity' | 'pricePerUnit',
    value: string,
  ) => {
    const nextItems = form.orderItems.map((item) => {
      if (item.id !== itemId) {
        return item
      }

      const nextItem = {
        ...item,
        [field]: field === 'pricePerUnit' ? formatPriceInput(parsePriceInput(value)) : value,
      }

      return recalculateItem(nextItem)
    })

    updateOrderItems(nextItems)
  }

  const handleRemoveItem = (itemId: string) => {
    updateOrderItems(form.orderItems.filter((item) => item.id !== itemId))
  }

  const handleCreateService = async () => {
    if (!newSvcName.trim() || !newSvcSubcat) {
      return
    }

    setSavingNew(true)

    const { data } = await localDb
      .from('services')
      .insert({
        subcategory_id: newSvcSubcat,
        name: newSvcName.trim(),
        unit_of_measure: 'pcs',
        price_per_unit: 0,
        is_archived: false,
      })
      .select()
      .single()

    if (data) {
      handleServiceSelected(data as Service)
    }

    setNewSvcName('')
    setNewSvcCat('')
    setNewSvcSubcat('')
    setSavingNew(false)
    setNewModalOpen(false)
  }

  const newModalCatOptions = categories.map((category) => ({ value: category.id, label: category.name }))
  const newModalSubcatOptions = subcategories
    .filter((subcategory) => subcategory.category_id === newSvcCat)
    .map((subcategory) => ({ value: subcategory.id, label: subcategory.name }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Input
          label={t.stepOrder.orderTitleLabel}
          value={form.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder={t.stepOrder.orderTitlePlaceholder}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.common.description}</label>
          <textarea
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={2}
            placeholder={t.stepOrder.descriptionPlaceholder}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.orders.services}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.stepOrder.searchPlaceholder}
            </p>
          </div>
          <Button size="sm" onClick={() => setSearchModalOpen(true)}>
            {t.stepOrder.searchTitle}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t.common.loading}</p>
        ) : form.orderItems.length === 0 ? (
          <div className="border-2 border-dashed border-orange-200 dark:border-orange-800 rounded-2xl p-8 text-center">
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">{t.stepOrder.noItemsHint}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.stepOrder.noTotalAmount}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {form.orderItems.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-800/50"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.serviceName}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                        {item.categoryName || '-'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                        {item.subcategoryName || '-'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                        {item.unitLabel}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="w-9 h-9 rounded-xl border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center cursor-pointer shrink-0"
                    aria-label={t.common.delete}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label={t.stepOrder.quantityLabel}
                    type="number"
                    value={item.quantity}
                    onChange={(event) => handleItemChange(item.id, 'quantity', event.target.value)}
                    placeholder="1"
                    min="0"
                  />
                  <PriceInput
                    label={
                      item.unitLabel
                        ? `${t.stepOrder.pricePerUnitLabel} (${item.unitLabel})`
                        : t.stepOrder.pricePerUnitLabel
                    }
                    value={item.pricePerUnit}
                    onChange={(value) => handleItemChange(item.id, 'pricePerUnit', value)}
                    placeholder="0"
                  />
                  <PriceInput
                    label={t.common.total}
                    value={item.totalPrice}
                    onChange={() => undefined}
                    readOnly
                    placeholder={t.stepOrder.autoPlaceholder}
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.common.total}</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(itemsTotal)}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="mt-4 text-sm text-blue-600 hover:underline cursor-pointer"
        >
          {t.stepOrder.addNewService}
        </button>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t.stepOrder.orderParamsTitle}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t.common.deadline}
            type="date"
            value={form.deadline}
            onChange={(event) => onChange({ deadline: event.target.value })}
          />
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{t.common.priority}</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as OrderPriority[]).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => onChange({ priority })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border flex-1 ${
                    form.priority === priority
                      ? priority === 'low'
                        ? 'bg-green-600 text-white border-green-600'
                        : priority === 'medium'
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'bg-red-600 text-white border-red-600'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                >
                  {t.priority[priority]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ isUrgent: !form.isUrgent })}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              form.isUrgent ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.isUrgent ? 'translate-x-5' : ''
              }`}
            />
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.stepOrder.urgentOrderLabel}</span>
          {form.isUrgent ? (
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              {t.common.urgent}
            </span>
          ) : null}
        </div>
      </div>

      {searchModalOpen ? (
        <ServiceSearchModal
          services={services}
          subcategories={subcategories}
          categories={categories}
          onSelect={handleServiceSelected}
          onClose={() => setSearchModalOpen(false)}
        />
      ) : null}

      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title={t.stepOrder.newServiceTitle}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t.stepOrder.serviceNameLabel}
            value={newSvcName}
            onChange={(event) => setNewSvcName(event.target.value)}
            placeholder={t.stepOrder.searchPlaceholder}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.stepOrder.categoryLabel}
            </label>
            <select
              value={newSvcCat}
              onChange={(event) => {
                setNewSvcCat(event.target.value)
                setNewSvcSubcat('')
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.stepOrder.selectPlaceholder}</option>
              {newModalCatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.stepOrder.subcategoryLabel}
            </label>
            <select
              value={newSvcSubcat}
              onChange={(event) => setNewSvcSubcat(event.target.value)}
              disabled={!newSvcCat}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-800"
            >
              <option value="">{t.stepOrder.selectPlaceholder}</option>
              {newModalSubcatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleCreateService}
              loading={savingNew}
              disabled={!newSvcName.trim() || !newSvcSubcat}
            >
              {t.stepOrder.createAndAddBtn}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

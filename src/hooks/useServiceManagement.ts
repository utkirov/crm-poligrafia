import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import type { Service, ServiceCategory, ServiceSubcategory } from '../types'

export interface ServiceWithUsage extends Service {
  usageCount: number
}

export interface SubcategoryWithCount extends ServiceSubcategory {
  serviceCount: number
}

export interface CategoryWithCount extends ServiceCategory {
  totalServices: number
}

async function loadServiceManagementData() {
  const [categoriesRes, subcategoriesRes, servicesRes, usageRes] = await Promise.all([
    localDb.from('service_categories').select('*').order('name'),
    localDb.from('service_subcategories').select('*').order('name'),
    localDb.from('services').select('*').order('name'),
    localDb.from('order_items').select('service_id'),
  ])

  const usageMap: Record<string, number> = {}
  for (const row of (usageRes.data ?? []) as { service_id: string | null }[]) {
    if (row.service_id) {
      usageMap[row.service_id] = (usageMap[row.service_id] ?? 0) + 1
    }
  }

  const services = ((servicesRes.data ?? []) as Service[]).map((service) => ({
    ...service,
    usageCount: usageMap[service.id] ?? 0,
  }))

  const subcategories = ((subcategoriesRes.data ?? []) as ServiceSubcategory[]).map((subcategory) => ({
    ...subcategory,
    serviceCount: services.filter((service) => service.subcategory_id === subcategory.id && !service.is_archived).length,
  }))

  const categories = ((categoriesRes.data ?? []) as ServiceCategory[]).map((category) => {
    const subcategoryIds = subcategories
      .filter((subcategory) => subcategory.category_id === category.id)
      .map((subcategory) => subcategory.id)

    return {
      ...category,
      totalServices: services.filter(
        (service) => subcategoryIds.includes(service.subcategory_id) && !service.is_archived,
      ).length,
    }
  })

  return { categories, subcategories, services }
}

export function useServiceManagement() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryWithCount[]>([])
  const [services, setServices] = useState<ServiceWithUsage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchServiceManagement = useCallback(async () => {
    setLoading(true)
    const nextData = await loadServiceManagementData()
    setCategories(nextData.categories)
    setSubcategories(nextData.subcategories)
    setServices(nextData.services)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const nextData = await loadServiceManagementData()
      if (cancelled) return
      setCategories(nextData.categories)
      setSubcategories(nextData.subcategories)
      setServices(nextData.services)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return { categories, subcategories, services, loading, refetch: fetchServiceManagement }
}

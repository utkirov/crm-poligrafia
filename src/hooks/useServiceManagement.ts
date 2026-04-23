import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ServiceCategory, ServiceSubcategory, Service } from '../types'

export interface ServiceWithUsage extends Service {
  usageCount: number
}

export interface SubcategoryWithCount extends ServiceSubcategory {
  serviceCount: number
}

export interface CategoryWithCount extends ServiceCategory {
  totalServices: number
}

export function useServiceManagement() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryWithCount[]>([])
  const [services, setServices] = useState<ServiceWithUsage[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [catsRes, subsRes, svcsRes, usageRes] = await Promise.all([
      supabase.from('service_categories').select('*').order('name'),
      supabase.from('service_subcategories').select('*').order('name'),
      supabase.from('services').select('*').order('name'),
      supabase.from('order_items').select('service_id'),
    ])

    const usageMap: Record<string, number> = {}
    for (const row of (usageRes.data ?? []) as { service_id: string | null }[]) {
      if (row.service_id) usageMap[row.service_id] = (usageMap[row.service_id] ?? 0) + 1
    }

    const svcs = ((svcsRes.data ?? []) as Service[]).map((s) => ({
      ...s,
      usageCount: usageMap[s.id] ?? 0,
    }))

    const subs = ((subsRes.data ?? []) as ServiceSubcategory[]).map((sub) => ({
      ...sub,
      serviceCount: svcs.filter((s) => s.subcategory_id === sub.id && !s.is_archived).length,
    }))

    const cats = ((catsRes.data ?? []) as ServiceCategory[]).map((cat) => {
      const catSubIds = subs.filter((s) => s.category_id === cat.id).map((s) => s.id)
      return {
        ...cat,
        totalServices: svcs.filter((s) => catSubIds.includes(s.subcategory_id) && !s.is_archived).length,
      }
    })

    setCategories(cats)
    setSubcategories(subs)
    setServices(svcs)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { categories, subcategories, services, loading, refetch: fetch }
}

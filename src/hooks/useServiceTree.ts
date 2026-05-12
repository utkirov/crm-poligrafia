import { useState, useEffect } from 'react'
import { localDb } from '../lib/localDb'
import type { ServiceCategory, ServiceSubcategory, Service } from '../types'

export interface ServiceTree {
  categories: ServiceCategory[]
  subcategories: ServiceSubcategory[]
  services: Service[]
  loading: boolean
}

export function useServiceTree(): ServiceTree {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [cats, subs, svcs] = await Promise.all([
        localDb.from('service_categories').select('*').order('name'),
        localDb.from('service_subcategories').select('*').order('name'),
        localDb.from('services').select('*').eq('is_archived', false).order('name'),
      ])
      setCategories((cats.data ?? []) as ServiceCategory[])
      setSubcategories((subs.data ?? []) as ServiceSubcategory[])
      setServices((svcs.data ?? []) as Service[])
      setLoading(false)
    }
    load()
  }, [])

  return { categories, subcategories, services, loading }
}

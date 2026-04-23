import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { OrderDetail } from '../types'

export function useOrder(id: string | undefined) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(
          *,
          referrer:referrer_id(id, name, cashback_percent)
        ),
        manager:profiles(id, name),
        order_items(
          *,
          service:services(
            id, name,
            subcategory:service_subcategories(
              id, name,
              category:service_categories(id, name)
            )
          )
        ),
        payments(*),
        order_timeline(*, user:profiles(id, name))
      `)
      .eq('id', id)
      .single()

    if (err) {
      setError(err.message)
    } else {
      setOrder(data as unknown as OrderDetail)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { order, loading, error, refetch: fetch }
}

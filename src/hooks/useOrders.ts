import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { OrderWithClient } from '../types'

export function useOrders() {
  const [orders, setOrders] = useState<OrderWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(id, name, phone, telegram, cashback_balance, cashback_percent),
        manager:profiles(id, name)
      `)
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setOrders((data ?? []) as unknown as OrderWithClient[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: re-fetch when any order changes
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetch()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { orders, loading, error, refetch: fetch }
}

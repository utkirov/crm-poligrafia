import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import { useAuthStore } from '../store/authStore'
import type { OrderWithClient } from '../types'

async function loadOrders(userId?: string, role?: string) {
  let query = localDb
    .from('orders')
    .select(`
      *,
      client:clients(id, name, phone, telegram, cashback_balance, cashback_percent),
      manager:profiles(id, name)
    `)
    .order('created_at', { ascending: false })

  if (role === 'manager' && userId) {
    query = query.eq('manager_id', userId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as OrderWithClient[]
}

export function useOrders() {
  const userId = useAuthStore((state) => state.user?.id)
  const userRole = useAuthStore((state) => state.user?.role)
  const [orders, setOrders] = useState<OrderWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const nextOrders = await loadOrders(userId, userRole)
      setOrders(nextOrders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [userId, userRole])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const nextOrders = await loadOrders(userId, userRole)
        if (cancelled) return
        setOrders(nextOrders)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId, userRole])

  useEffect(() => {
    const channel = localDb
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchOrders()
      })
      .subscribe()

    return () => {
      void localDb.removeChannel(channel)
    }
  }, [fetchOrders])

  return { orders, loading, error, refetch: fetchOrders }
}

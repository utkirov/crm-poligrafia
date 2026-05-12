import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import { useAuthStore } from '../store/authStore'
import type { OrderDetail } from '../types'

async function loadOrderDetail(id: string, userId?: string, role?: string) {
  const { data, error } = await localDb
    .from('orders')
    .select(`
      *,
      client:clients(
        *,
        referrer:referrer_id(id, name, cashback_percent, cashback_balance)
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

  if (error) {
    throw new Error(error.message)
  }

  const order = data as unknown as OrderDetail

  if (role === 'manager' && order.manager?.id !== userId) {
    throw new Error('Order not found')
  }

  if (role === 'designer' && order.order_ticket?.designer_assignee?.id !== userId) {
    throw new Error('Order not found')
  }

  return order
}

export function useOrder(id: string | undefined) {
  const userId = useAuthStore((state) => state.user?.id)
  const userRole = useAuthStore((state) => state.user?.role)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!id) {
      setOrder(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const nextOrder = await loadOrderDetail(id, userId, userRole)
      setOrder(nextOrder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [id, userId, userRole])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!id) {
        if (!cancelled) {
          setOrder(null)
          setError(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)

      try {
        const nextOrder = await loadOrderDetail(id, userId, userRole)
        if (cancelled) return
        setOrder(nextOrder)
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
  }, [id, userId, userRole])

  useEffect(() => {
    const orderChannel = localDb
      .channel(`order-${id}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchOrder()
      })
      .subscribe()

    const ticketChannel = localDb
      .channel(`order-${id}-ticket-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_tickets' }, () => {
        void fetchOrder()
      })
      .subscribe()

    return () => {
      void localDb.removeChannel(orderChannel)
      void localDb.removeChannel(ticketChannel)
    }
  }, [fetchOrder, id])

  return { order, loading, error, refetch: fetchOrder }
}

import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import { useAuthStore } from '../store/authStore'
import type { OrderTicketDetail } from '../types'

async function loadOrderTickets(userId?: string, role?: string) {
  let query = localDb
    .from('order_tickets')
    .select('*')
    .order('updated_at', { ascending: false })

  if (role === 'manager' && userId) {
    query = query.eq('manager_assignee_id', userId)
  }

  if (role === 'designer' && userId) {
    query = query.eq('designer_assignee_id', userId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as OrderTicketDetail[]
}

export function useOrderTickets() {
  const userId = useAuthStore((state) => state.user?.id)
  const userRole = useAuthStore((state) => state.user?.role)
  const [tickets, setTickets] = useState<OrderTicketDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const nextTickets = await loadOrderTickets(userId, userRole)
      setTickets(nextTickets)
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
        const nextTickets = await loadOrderTickets(userId, userRole)
        if (cancelled) return
        setTickets(nextTickets)
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
    const ticketChannel = localDb
      .channel('order-tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_tickets' }, () => {
        void fetchTickets()
      })
      .subscribe()

    const orderChannel = localDb
      .channel('order-tickets-order-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchTickets()
      })
      .subscribe()

    return () => {
      void localDb.removeChannel(ticketChannel)
      void localDb.removeChannel(orderChannel)
    }
  }, [fetchTickets])

  return { tickets, loading, error, refetch: fetchTickets }
}

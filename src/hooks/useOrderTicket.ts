import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import { useAuthStore } from '../store/authStore'
import type { OrderTicketDetail } from '../types'

async function loadOrderTicket(id: string, userId?: string, role?: string) {
  const { data, error } = await localDb
    .from('order_tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const ticket = data as unknown as OrderTicketDetail

  if (role === 'manager' && ticket.manager_assignee?.id !== userId) {
    throw new Error('Ticket not found')
  }

  if (role === 'designer' && ticket.designer_assignee?.id !== userId) {
    throw new Error('Ticket not found')
  }

  return ticket
}

export function useOrderTicket(id: string | undefined) {
  const userId = useAuthStore((state) => state.user?.id)
  const userRole = useAuthStore((state) => state.user?.role)
  const [ticket, setTicket] = useState<OrderTicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTicket = useCallback(async () => {
    if (!id) {
      setTicket(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const nextTicket = await loadOrderTicket(id, userId, userRole)
      setTicket(nextTicket)
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
          setTicket(null)
          setError(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)

      try {
        const nextTicket = await loadOrderTicket(id, userId, userRole)
        if (cancelled) return
        setTicket(nextTicket)
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
    const ticketChannel = localDb
      .channel(`order-ticket-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_tickets' }, () => {
        void fetchTicket()
      })
      .subscribe()

    const orderChannel = localDb
      .channel(`order-ticket-order-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchTicket()
      })
      .subscribe()

    return () => {
      void localDb.removeChannel(ticketChannel)
      void localDb.removeChannel(orderChannel)
    }
  }, [fetchTicket, id])

  return { ticket, loading, error, refetch: fetchTicket }
}

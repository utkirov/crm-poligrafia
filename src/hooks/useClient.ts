import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import type { CashbackTransaction, Client, Order } from '../types'

export interface ClientDetail extends Client {
  referrer: Pick<Client, 'id' | 'name' | 'cashback_percent'> | null
  orders: Order[]
  cashback_transactions: CashbackTransaction[]
  referrals: Client[]
}

async function loadClientDetail(id: string) {
  const [clientRes, referralsRes] = await Promise.all([
    localDb
      .from('clients')
      .select(`
        *,
        referrer:referrer_id(id, name, cashback_percent)
      `)
      .eq('id', id)
      .single(),
    localDb.from('clients').select('*').eq('referrer_id', id).eq('is_archived', false),
  ])

  if (clientRes.error) {
    throw new Error(clientRes.error.message)
  }

  const [ordersRes, txRes] = await Promise.all([
    localDb.from('orders').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    localDb
      .from('cashback_transactions')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ])

  return {
    ...(clientRes.data as unknown as ClientDetail),
    orders: (ordersRes.data ?? []) as Order[],
    cashback_transactions: (txRes.data ?? []) as CashbackTransaction[],
    referrals: (referralsRes.data ?? []) as Client[],
  }
}

export function useClient(id: string | undefined) {
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClient = useCallback(async () => {
    if (!id) {
      setClient(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const nextClient = await loadClientDetail(id)
      setClient(nextClient)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!id) {
        if (!cancelled) {
          setClient(null)
          setError(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)

      try {
        const nextClient = await loadClientDetail(id)
        if (cancelled) return
        setClient(nextClient)
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
  }, [id])

  return { client, loading, error, refetch: fetchClient }
}

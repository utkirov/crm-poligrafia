import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Client, CashbackTransaction, Order } from '../types'

export interface ClientDetail extends Client {
  referrer: Pick<Client, 'id' | 'name' | 'cashback_percent'> | null
  orders: Order[]
  cashback_transactions: CashbackTransaction[]
  referrals: Client[]
}

export function useClient(id: string | undefined) {
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    const [clientRes, referralsRes] = await Promise.all([
      supabase.from('clients').select(`
        *,
        referrer:referrer_id(id, name, cashback_percent)
      `).eq('id', id).single(),
      supabase.from('clients').select('*').eq('referrer_id', id).eq('is_archived', false),
    ])

    if (clientRes.error) { setError(clientRes.error.message); setLoading(false); return }

    const [ordersRes, txRes] = await Promise.all([
      supabase.from('orders').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('cashback_transactions').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ])

    setClient({
      ...(clientRes.data as unknown as ClientDetail),
      orders: (ordersRes.data ?? []) as Order[],
      cashback_transactions: (txRes.data ?? []) as CashbackTransaction[],
      referrals: (referralsRes.data ?? []) as Client[],
    })
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { client, loading, error, refetch: fetch }
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Client } from '../types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('is_archived', false)
      .order('name')
    setClients((data ?? []) as Client[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { clients, loading, refetch: fetch }
}

export function useClientSearch(query: string) {
  const [results, setResults] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      const q = query.trim()
      const { data } = await supabase
        .from('clients')
        .select('*, referrer:referrer_id(id, name, cashback_percent, cashback_balance)')
        .eq('is_archived', false)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10)
      if (!cancelled) {
        setResults((data ?? []) as Client[])
        setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  return { results, loading }
}

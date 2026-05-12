import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import type { Client } from '../types'

async function loadClients() {
  return localDb
    .from('clients')
    .select('*')
    .eq('is_archived', false)
    .order('name')
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const { data } = await loadClients()
    setClients((data ?? []) as Client[])
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await loadClients()
      if (cancelled) return
      setClients((data ?? []) as Client[])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return { clients, loading, refetch: fetchClients }
}

export function useClientSearch(query: string) {
  const [results, setResults] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(async () => {
      const trimmedQuery = query.trim()

      if (!trimmedQuery) {
        if (!cancelled) {
          setResults([])
          setLoading(false)
        }
        return
      }

      setLoading(true)

      const { data } = await localDb
        .from('clients')
        .select('*, referrer:referrer_id(id, name, cashback_percent, cashback_balance)')
        .eq('is_archived', false)
        .or(`name.ilike.%${trimmedQuery}%,phone.ilike.%${trimmedQuery}%`)
        .limit(10)

      if (cancelled) return

      setResults((data ?? []) as Client[])
      setLoading(false)
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  return { results, loading }
}

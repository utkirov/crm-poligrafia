import { useCallback, useEffect, useState } from 'react'
import * as localDbModule from '../lib/localDb'
import type { MonthlyKpi } from '../types'

type MonthlyKpiStore = {
  from: (table: 'monthly_kpis') => {
    select: (columns?: string) => {
      eq: (field: string, value: string) => {
        order: (field: string, options?: { ascending?: boolean }) => Promise<{ data: MonthlyKpi[] | null }>
      }
    }
  }
  channel: typeof localDbModule.localDb.channel
  removeChannel: typeof localDbModule.localDb.removeChannel
}

type GetUserMonthlyKpis = (userId: string) => Promise<{ data: MonthlyKpi[] | null }>

const localDb = localDbModule.localDb as unknown as MonthlyKpiStore
const getUserMonthlyKpis = (
  localDbModule as unknown as { getUserMonthlyKpis?: GetUserMonthlyKpis }
).getUserMonthlyKpis

async function loadUserMonthlyKpis(userId: string): Promise<{ data: MonthlyKpi[] | null }> {
  if (getUserMonthlyKpis) {
    return getUserMonthlyKpis(userId)
  }

  const result = await localDb
    .from('monthly_kpis')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: false })

  return {
    data: (result.data ?? null) as MonthlyKpi[] | null,
  }
}

export function useMonthlyKpis(userId?: string) {
  const [items, setItems] = useState<MonthlyKpi[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await loadUserMonthlyKpis(userId)
    setItems(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!userId) {
        if (!cancelled) {
          setItems([])
          setLoading(false)
        }
        return
      }

      setLoading(true)
      const { data } = await loadUserMonthlyKpis(userId)
      if (cancelled) {
        return
      }

      setItems(data ?? [])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    const channel = localDb
      .channel(`monthly-kpis-${userId ?? 'none'}`)
      .on('postgres_changes', { table: 'monthly_kpis' }, () => {
        void refetch()
      })
      .subscribe()

    return () => {
      void localDb.removeChannel(channel)
    }
  }, [refetch, userId])

  return { items, loading, refetch }
}

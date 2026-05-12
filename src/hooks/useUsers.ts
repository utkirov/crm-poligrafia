import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import type { Profile } from '../types'

export type UserProfile = Profile

async function loadUsers() {
  return localDb
    .from('profiles')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name')
}

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await loadUsers()
    setUsers((data ?? []) as UserProfile[])
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await loadUsers()
      if (cancelled) return
      setUsers((data ?? []) as UserProfile[])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return { users, loading, refetch: fetchUsers }
}

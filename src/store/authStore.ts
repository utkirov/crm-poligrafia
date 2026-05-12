import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, UserRole } from '../types'
import type { Profile } from '../types/database'
import { localDb } from '../lib/localDb'

interface AuthSession {
  user: {
    id: string
    email?: string
  }
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (login: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

function profileToUser(profile: Profile, email: string | undefined): AuthUser {
  return {
    id: profile.id,
    email,
    name: profile.name,
    role: profile.role as UserRole,
    is_active: profile.is_active,
  }
}

let authListenerBound = false

async function syncUserFromSession(
  session: AuthSession | null,
  set: (partial: Partial<AuthState>) => void,
) {
  if (!session?.user) {
    set({ user: null, loading: false })
    return
  }

  const { data: profile } = await localDb
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile || !profile.is_active) {
    await localDb.auth.signOut()
    set({ user: null, loading: false })
    return
  }

  set({
    user: profileToUser(profile, session.user.email),
    loading: false,
  })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,

      initialize: async () => {
        set({ loading: true })

        if (!authListenerBound) {
          localDb.auth.onAuthStateChange((_event, session) => {
            void syncUserFromSession(session, set)
          })
          authListenerBound = true
        }

        const {
          data: { session },
        } = await localDb.auth.getSession()

        await syncUserFromSession(session, set)
      },

      login: async (login: string, password: string) => {
        const email = `${login}@crm.internal`
        const { data, error } = await localDb.auth.signInWithPassword({ email, password })
        if (error || !data.user) {
          return 'invalidCreds'
        }
        const { data: profile } = await localDb
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        if (!profile) {
          await localDb.auth.signOut()
          return 'profileNotFound'
        }
        if (!profile.is_active) {
          await localDb.auth.signOut()
          return 'accountDisabled'
        }
        set({
          user: profileToUser(profile, data.user.email),
          loading: false,
        })
        return null
      },

      logout: async () => {
        await localDb.auth.signOut()
        set({ user: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

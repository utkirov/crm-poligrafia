import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, UserRole } from '../types'
import type { Profile } from '../types/database'
import { supabase } from '../lib/supabase'

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
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,

      initialize: async () => {
        set({ loading: true })
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (profile) {
            set({ user: profileToUser(profile, session.user.email), loading: false })
            return
          }
        }
        set({ user: null, loading: false })
      },

      login: async (login: string, password: string) => {
        const email = `${login}@crm.internal`
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.user) {
          return 'Неверный логин или пароль'
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        if (!profile) {
          await supabase.auth.signOut()
          return 'Профиль пользователя не найден'
        }
        set({ user: profileToUser(profile, data.user.email) })
        return null
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

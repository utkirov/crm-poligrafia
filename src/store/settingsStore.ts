import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme  = 'light' | 'dark'
export type Locale = 'ru' | 'uz'

interface SettingsState {
  theme:  Theme
  locale: Locale
  setTheme:  (t: Theme)  => void
  setLocale: (l: Locale) => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme:  'light',
      locale: 'ru',

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      setLocale: (locale) => set({ locale }),

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: next })
        applyTheme(next)
      },
    }),
    {
      name: 'crm-settings',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)

/** Apply or remove `dark` class on <html> */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

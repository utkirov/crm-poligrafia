import { useSettingsStore } from '../store/settingsStore'
import { ru } from './ru'
import { uz } from './uz'

const locales = { ru, uz }

/** Returns the full translation object for the current locale */
export function useT() {
  const locale = useSettingsStore((s) => s.locale)
  return locales[locale] ?? locales.ru
}

export type { Translations } from './ru'

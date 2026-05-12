import { useRef, useState, type ChangeEvent } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { getLocalDatabaseSnapshot, importLocalDatabaseSnapshot, resetLocalDemoData } from '../lib/localDb'
import { toastError, toastSuccess } from '../lib/toast'
import { useSettingsStore } from '../store/settingsStore'

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(id)
    window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1500)
  }

  return { copied, copy }
}

export function LocalDataPage() {
  const locale = useSettingsStore((state) => state.locale)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState<'export' | 'import' | 'reset' | null>(null)
  const { copied, copy } = useCopy()

  const text = locale === 'uz'
    ? {
        title: 'Mahalliy maʼlumotlar',
        subtitle: 'Demo bazani eksport qilish, import qilish va tiklash boshqaruvi',
        exportTitle: 'Eksport',
        exportText: 'Joriy localStorage bazasini JSON fayl sifatida yuklab oling.',
        exportBtn: 'Bazani eksport qilish',
        importTitle: 'Import',
        importText: 'Oldin eksport qilingan JSON snapshotni yuklang. Import joriy sessiyani yakunlaydi.',
        importBtn: 'Bazani import qilish',
        resetTitle: 'Demo bazani tiklash',
        resetText: 'Standart demo maʼlumotlarini qayta yaratadi va joriy foydalanuvchini tizimdan chiqaradi.',
        resetBtn: 'Demo bazani tiklash',
        accountsTitle: 'Demo loginlar',
        copied: 'Nusxalandi',
        copyLogin: 'Loginni nusxalash',
        copyPassword: 'Parolni nusxalash',
        confirmReset: 'Demo bazani qayta tiklashni tasdiqlaysizmi? Joriy local maʼlumotlar oʼchiriladi.',
        exportDone: 'Mahalliy baza eksport qilindi',
        importDone: 'Mahalliy baza import qilindi. Tizimga qayta kiring.',
        resetDone: 'Demo baza tiklandi. Tizimga qayta kiring.',
        importError: 'Snapshotni import qilishning imkoni boʼlmadi',
      }
    : {
        title: 'Локальные данные',
        subtitle: 'Управление экспортом, импортом и сбросом локальной демо-базы',
        exportTitle: 'Экспорт',
        exportText: 'Скачайте текущую базу из localStorage в виде JSON-файла.',
        exportBtn: 'Экспортировать базу',
        importTitle: 'Импорт',
        importText: 'Загрузите ранее экспортированный JSON snapshot. Импорт завершит текущую сессию.',
        importBtn: 'Импортировать базу',
        resetTitle: 'Сброс демо-базы',
        resetText: 'Полностью пересоздаёт стандартные демо-данные и завершает текущую сессию.',
        resetBtn: 'Сбросить демо-базу',
        accountsTitle: 'Демо-логины',
        copied: 'Скопировано',
        copyLogin: 'Скопировать логин',
        copyPassword: 'Скопировать пароль',
        confirmReset: 'Подтвердите сброс демо-базы. Текущие локальные данные будут заменены.',
        exportDone: 'Локальная база экспортирована',
        importDone: 'Локальная база импортирована. Войдите в систему заново.',
        resetDone: 'Демо-база сброшена. Войдите в систему заново.',
        importError: 'Не удалось импортировать snapshot',
      }

  const accounts = [
    { id: 'director', role: locale === 'uz' ? 'Direktor' : 'Директор', login: 'director', password: '123456' },
    { id: 'financier', role: locale === 'uz' ? 'Moliyachi' : 'Финансист', login: 'financier', password: '123456' },
    { id: 'manager', role: locale === 'uz' ? 'Menejer' : 'Менеджер', login: 'manager1', password: '123456' },
  ]

  const handleExport = async () => {
    setBusy('export')
    try {
      const snapshot = getLocalDatabaseSnapshot()
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `crm-poligraf-local-${snapshot.exported_at.slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toastSuccess(text.exportDone)
    } finally {
      setBusy(null)
    }
  }

  const handleImportClick = () => {
    inputRef.current?.click()
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBusy('import')
    try {
      const raw = await file.text()
      importLocalDatabaseSnapshot(raw)
      toastSuccess(text.importDone)
      window.location.assign('/login')
    } catch {
      toastError(text.importError)
    } finally {
      event.target.value = ''
      setBusy(null)
    }
  }

  const handleReset = () => {
    if (!window.confirm(text.confirmReset)) {
      return
    }

    setBusy('reset')
    try {
      resetLocalDemoData()
      toastSuccess(text.resetDone)
      window.location.assign('/login')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <Breadcrumbs items={[{ label: text.title }]} />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{text.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{text.subtitle}</p>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-4 max-w-5xl">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{text.exportTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4">{text.exportText}</p>
            <Button onClick={handleExport} loading={busy === 'export'}>
              {text.exportBtn}
            </Button>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{text.importTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4">{text.importText}</p>
            <Button variant="secondary" onClick={handleImportClick} loading={busy === 'import'}>
              {text.importBtn}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{text.resetTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4">{text.resetText}</p>
            <Button variant="danger" onClick={handleReset} loading={busy === 'reset'}>
              {text.resetBtn}
            </Button>
          </section>
        </div>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{text.accountsTitle}</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {accounts.map((account) => (
              <div key={account.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{account.role}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {account.login} / {account.password}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void copy(account.login, `${account.id}-login`)}>
                    {copied === `${account.id}-login` ? text.copied : text.copyLogin}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void copy(account.password, `${account.id}-password`)}>
                    {copied === `${account.id}-password` ? text.copied : text.copyPassword}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

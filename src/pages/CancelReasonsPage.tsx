import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Spinner } from '../components/Spinner'
import { useT } from '../i18n'

interface CancelReason {
  id: string
  reason: string
  is_active: boolean
  created_at: string
}

async function loadCancelReasons() {
  const { data } = await localDb
    .from('cancel_reasons')
    .select('*')
    .order('created_at', { ascending: true })

  return (data ?? []) as CancelReason[]
}

export function CancelReasonsPage() {
  const t = useT()
  const [reasons, setReasons] = useState<CancelReason[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editReason, setEditReason] = useState<CancelReason | null>(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchReasons = useCallback(async () => {
    setLoading(true)
    const nextReasons = await loadCancelReasons()
    setReasons(nextReasons)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const nextReasons = await loadCancelReasons()
      if (cancelled) return
      setReasons(nextReasons)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const openAdd = () => {
    setText('')
    setAddOpen(true)
  }

  const openEdit = (reason: CancelReason) => {
    setEditReason(reason)
    setText(reason.reason)
  }

  const closeModals = () => {
    setAddOpen(false)
    setEditReason(null)
    setText('')
  }

  const handleSave = async () => {
    if (!text.trim()) return

    setSaving(true)

    if (editReason) {
      await localDb.from('cancel_reasons').update({ reason: text.trim() }).eq('id', editReason.id)
    } else {
      await localDb.from('cancel_reasons').insert({ reason: text.trim() })
    }

    setSaving(false)
    closeModals()
    await fetchReasons()
  }

  const toggleActive = async (reason: CancelReason) => {
    await localDb
      .from('cancel_reasons')
      .update({ is_active: !reason.is_active })
      .eq('id', reason.id)

    await fetchReasons()
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.cancelReasons.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t.cancelReasons.subtitle}</p>
          </div>
          <Button onClick={openAdd}>+ {t.cancelReasons.add}</Button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Spinner className="w-6 h-6 text-blue-600" />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {reasons.length === 0 ? (
              <p className="px-4 py-12 text-center text-slate-400 dark:text-slate-600 text-sm">{t.cancelReasons.empty}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t.cancelReasons.colReason}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t.cancelReasons.colStatus}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {reasons.map((reason) => (
                    <tr
                      key={reason.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!reason.is_active ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{reason.reason}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            reason.is_active
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {reason.is_active ? t.cancelReasons.active : t.cancelReasons.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(reason)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {t.common.edit}
                          </button>
                          <button
                            onClick={() => toggleActive(reason)}
                            className="text-xs text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                          >
                            {reason.is_active ? t.cancelReasons.disable : t.cancelReasons.enable}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <Modal
        open={addOpen || !!editReason}
        onClose={closeModals}
        title={editReason ? t.cancelReasons.editTitle : t.cancelReasons.addTitle}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              {t.cancelReasons.reasonLabel}
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
              placeholder={t.cancelReasons.reasonPlaceholder}
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModals}>{t.common.cancel}</Button>
            <Button onClick={handleSave} loading={saving} disabled={!text.trim()}>
              {editReason ? t.common.save : t.common.add}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

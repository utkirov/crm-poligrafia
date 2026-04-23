import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'
import { useT } from '../i18n'
import type { Client, ClientType } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  initial?: Client | null
}

export function ClientFormModal({ open, onClose, onSaved, initial }: Props) {
  const t = useT()
  const isEdit = Boolean(initial)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [type, setType] = useState<ClientType>(initial?.type ?? 'individual')
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [telegram, setTelegram] = useState(initial?.telegram ?? '')
  const [birthday, setBirthday] = useState(initial?.birthday ?? '')
  const [source, setSource] = useState(initial?.source ?? '')
  const [cashbackPct, setCashbackPct] = useState(String(initial?.cashback_percent ?? 5))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && initial) {
      setType(initial.type); setName(initial.name); setPhone(initial.phone ?? '')
      setTelegram(initial.telegram ?? ''); setBirthday(initial.birthday ?? '')
      setSource(initial.source ?? ''); setCashbackPct(String(initial.cashback_percent))
    } else if (open && !initial) {
      setType('individual'); setName(''); setPhone(''); setTelegram('')
      setBirthday(''); setSource(''); setCashbackPct('5')
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!name.trim()) { setError(t.clientForm.nameError); return }
    setSaving(true); setError('')
    const payload = {
      name: name.trim(), type, phone: phone || null,
      telegram: telegram || null, birthday: birthday || null,
      source: source || null, cashback_percent: parseFloat(cashbackPct) || 0,
    }
    if (isEdit && initial) {
      await db.from('clients').update(payload).eq('id', initial.id)
    } else {
      await db.from('clients').insert({ ...payload, cashback_balance: 0, is_archived: false })
    }
    setSaving(false); onSaved(); onClose()
  }

  const typeLabels: Record<ClientType, string> = {
    individual: t.clientType.individual,
    company:    t.clientType.company,
    agent:      t.clientType.agent,
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t.clientForm.editTitle : t.clientForm.createTitle} className="max-w-lg">
      <div className="flex flex-col gap-4">
        {/* Type toggle */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">{t.clientForm.typeLabel}</label>
          <div className="flex gap-2">
            {(['individual', 'company', 'agent'] as ClientType[]).map((ct) => (
              <button key={ct} type="button" onClick={() => setType(ct)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                  type === ct ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}>
                {typeLabels[ct]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label={t.clientForm.nameLabel} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.clientForm.namePlaceholder} />
          <Input label={t.common.phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 000 00 00" />
          <Input label={t.clientForm.telegramLabel} value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@username" />
          <Input label={t.clientForm.birthdayLabel} type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          <Input label={t.clientForm.sourceLabel} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram..." />
          <Input label={t.clientForm.cashbackLabel} type="number" value={cashbackPct} onChange={(e) => setCashbackPct(e.target.value)} placeholder="5" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t.common.cancel}</Button>
          <Button onClick={handleSave} loading={saving}>{isEdit ? t.common.save : t.common.create}</Button>
        </div>
      </div>
    </Modal>
  )
}

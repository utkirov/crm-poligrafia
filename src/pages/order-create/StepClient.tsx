import { useState, useRef, useEffect } from 'react'
import { useClientSearch } from '../../hooks/useClients'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { getInitials } from '../../utils/format'
import type { OrderFormState, NewClientDraft } from './types'
import type { Client, ClientType } from '../../types'
import { useT } from '../../i18n'

interface Props {
  form: OrderFormState
  onChange: (patch: Partial<OrderFormState>) => void
}

const TYPE_COLORS: Record<ClientType, 'blue' | 'purple' | 'teal'> = {
  individual: 'blue',
  company: 'purple',
  agent: 'teal',
}

// ─── Phone mask ───────────────────────────────────────────────
function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const local = digits.startsWith('998') ? digits.slice(3) : digits
  const d = local.slice(0, 9)
  let out = '+998'
  if (d.length > 0) out += ' ' + d.slice(0, 2)
  if (d.length > 2) out += ' ' + d.slice(2, 5)
  if (d.length > 5) out += ' ' + d.slice(5, 7)
  if (d.length > 7) out += ' ' + d.slice(7, 9)
  return out
}

function PhoneInput({
  value,
  onChange,
  placeholder = '+998 XX XXX XX XX',
  label,
  required,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
  required?: boolean
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(applyPhoneMask(e.target.value))
  }
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={17}
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}

// ─── Referrer search ──────────────────────────────────────────
function ReferrerSearch({
  value,
  onSelect,
}: {
  value: string
  onSelect: (id: string, name: string) => void
}) {
  const t = useT()
  const [q, setQ] = useState(value)
  const { results, loading } = useClientSearch(q)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setQ('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t.stepClient.referralLabel}</label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.stepClient.referralSearch}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {q && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 shadow-xl max-h-52 overflow-y-auto">
          {loading && <p className="px-4 py-3 text-sm text-gray-400">{t.common.searching}</p>}
          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">{t.stepClient.referralNotFound}</p>
          )}
          {results.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => { onSelect(client.id, client.name); setQ(client.name) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-left transition-colors"
            >
              <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                {getInitials(client.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{client.name}</p>
                <p className="text-xs text-gray-400">{client.phone ?? '—'}</p>
              </div>
              <Badge color={TYPE_COLORS[client.type]}>{t.clientType[client.type]}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Registration modal ───────────────────────────────────────
interface RegModalProps {
  draft: NewClientDraft
  onChange: (patch: Partial<NewClientDraft>) => void
  onClose: () => void
  onSave: () => void
}

function RegisterModal({ draft, onChange, onClose, onSave }: RegModalProps) {
  const t = useT()
  const isValid = draft.name.trim() && draft.phone.trim().length >= 8

  const sourceOptions = [
    { value: 'social_media', label: t.source.social_media },
    { value: 'flyer',        label: t.source.flyer },
    { value: 'referral',     label: t.source.referral },
    { value: 'word_of_mouth',label: t.source.word_of_mouth },
    { value: 'other',        label: t.source.other },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t.stepClient.regTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">{t.stepClient.clientTypeLabel}</label>
            <div className="flex gap-2">
              {(['individual', 'company', 'agent'] as ClientType[]).map((ct) => (
                <button
                  key={ct} type="button"
                  onClick={() => onChange({ type: ct })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                    draft.type === ct
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                >
                  {t.clientType[ct]}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                {t.stepClient.firstNameLabel} <span className="text-red-500">*</span>
              </label>
              <input
                value={draft.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Иван"
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t.stepClient.lastNameLabel}</label>
              <input
                value={draft.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
                placeholder="Иванов"
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Phone + Telegram */}
          <div className="grid grid-cols-2 gap-3">
            <PhoneInput
              label={t.common.phone}
              required
              value={draft.phone}
              onChange={(v) => onChange({ phone: v })}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t.stepClient.telegramLabel}</label>
              <input
                value={draft.telegram}
                onChange={(e) => onChange({ telegram: e.target.value })}
                placeholder="@username"
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t.stepClient.sourceLabel}</label>
            <select
              value={draft.source}
              onChange={(e) => onChange({ source: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">{t.source.none}</option>
              {sourceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Referrer */}
          <ReferrerSearch
            value={draft.referrerName}
            onSelect={(id, name) => onChange({ referrerId: id, referrerName: name, source: 'referral' })}
          />
          {draft.referrerId && (
            <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl text-sm">
              <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-teal-800 dark:text-teal-300 font-medium">{draft.referrerName}</span>
              <span className="text-teal-600 dark:text-teal-400">{t.stepClient.referralWillBe}</span>
              <button
                type="button"
                onClick={() => onChange({ referrerId: null, referrerName: '' })}
                className="ml-auto text-xs text-teal-500 hover:text-teal-700 cursor-pointer"
              >✕</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            {t.common.cancel}
          </button>
          <Button onClick={onSave} disabled={!isValid}>
            {t.stepClient.register}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main step ────────────────────────────────────────────────
export function StepClient({ form, onChange }: Props) {
  const t = useT()
  const [searchQuery, setSearchQuery] = useState('')
  const [regModalOpen, setRegModalOpen] = useState(false)
  const [draftClient, setDraftClient] = useState<NewClientDraft>(form.newClient)

  const { results, loading: searching } = useClientSearch(searchQuery)

  const sourceLabel = (src: string) =>
    src ? (t.source[src as keyof typeof t.source] ?? src) : ''

  const handleSelectClient = (client: Client) => {
    onChange({ selectedClient: client, newClient: { ...form.newClient, name: '', lastName: '', phone: '' } })
    setSearchQuery('')
  }

  const handleDraftChange = (patch: Partial<NewClientDraft>) => {
    setDraftClient((prev) => ({ ...prev, ...patch }))
  }

  const handleSaveNewClient = () => {
    onChange({ newClient: draftClient, selectedClient: null })
    setRegModalOpen(false)
  }

  const openRegModal = () => {
    setDraftClient(form.newClient)
    setRegModalOpen(true)
  }

  const newClientFilled = form.newClient.name.trim() && !form.selectedClient

  return (
    <div className="flex flex-col gap-6">
      {/* Search existing */}
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block mb-2">{t.stepClient.findExisting}</label>
        <div className="relative">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t.stepClient.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) onChange({ selectedClient: null }) }}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 shadow-xl max-h-64 overflow-y-auto">
              {searching && <p className="px-4 py-3 text-sm text-gray-400">{t.common.searching}</p>}
              {!searching && results.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">{t.stepClient.clientNotFound}</p>
              )}
              {results.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-left"
                >
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{client.name}</p>
                    <p className="text-xs text-gray-400">{client.phone ?? '—'}</p>
                  </div>
                  <Badge color={TYPE_COLORS[client.type]}>{t.clientType[client.type]}</Badge>
                  {client.cashback_balance > 0 && (
                    <span className="text-xs text-green-600 font-semibold shrink-0">
                      {client.cashback_balance.toLocaleString()} {t.stepClient.cashbackSuffix}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected client card */}
        {form.selectedClient && (
          <div className="mt-3 flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
            <div className="w-11 h-11 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
              {getInitials(form.selectedClient.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{form.selectedClient.name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {form.selectedClient.phone ?? '—'}
                {' · '}<Badge color={TYPE_COLORS[form.selectedClient.type]} className="ml-0">
                  {t.clientType[form.selectedClient.type]}
                </Badge>
              </p>
              {form.selectedClient.cashback_balance > 0 && (
                <p className="text-xs text-green-600 font-semibold mt-1">
                  {t.clientDetail.cashback}: {form.selectedClient.cashback_balance.toLocaleString()} {t.stepClient.cashbackSuffix}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange({ selectedClient: null })}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer shrink-0"
            >
              {t.stepClient.change}
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
        <span className="text-xs text-gray-400 font-medium">{t.common.or}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
      </div>

      {/* Register new client button */}
      {!newClientFilled ? (
        <button
          type="button"
          onClick={openRegModal}
          className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-150 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          {t.stepClient.registerNew}
        </button>
      ) : (
        /* New client filled-in card */
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
          <div className="w-11 h-11 bg-green-200 text-green-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
            {getInitials(`${form.newClient.name} ${form.newClient.lastName}`)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {form.newClient.name} {form.newClient.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{form.newClient.phone || '—'}</p>
            {form.newClient.source && (
              <p className="text-xs text-gray-400 mt-0.5">
                {t.stepClient.sourcePrefix}: {sourceLabel(form.newClient.source)}
              </p>
            )}
            {form.newClient.referrerName && (
              <p className="text-xs text-teal-600 mt-0.5">{t.stepClient.referralPrefix}: {form.newClient.referrerName}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{t.stepClient.newBadge}</span>
            <button
              type="button"
              onClick={openRegModal}
              className="text-xs text-gray-500 hover:underline cursor-pointer"
            >
              {t.stepClient.change}
            </button>
          </div>
        </div>
      )}

      {/* Registration modal */}
      {regModalOpen && (
        <RegisterModal
          draft={draftClient}
          onChange={handleDraftChange}
          onClose={() => setRegModalOpen(false)}
          onSave={handleSaveNewClient}
        />
      )}
    </div>
  )
}

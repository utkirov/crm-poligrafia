import { useEffect } from 'react'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { PriceInput } from '../../components/PriceInput'
import { formatCurrency } from '../../utils/format'
import { formatPriceInput, parsePriceInput } from '../../utils/priceInput'
import { useT } from '../../i18n'
import type { OrderFormState, PaymentDraft, PaymentMode } from './types'
import type { PaymentType } from '../../types'

interface Props {
  form: OrderFormState
  onChange: (patch: Partial<OrderFormState>) => void
}

export function StepPayment({ form, onChange }: Props) {
  const t = useT()

  const paymentTypeOptions = [
    { value: 'cash',          label: t.paymentType.cash },
    { value: 'transfer',      label: t.paymentType.transfer },
    { value: 'bank_transfer', label: t.paymentType.bank_transfer_short },
  ]

  const client = form.selectedClient
  const cashbackBalance = client?.cashback_balance ?? 0
  const hasCashback = cashbackBalance > 0

  const total       = parseFloat(form.totalAmount) || 0
  const costPrice   = parsePriceInput(form.costPrice)
  const cashbackUsed = form.applyCashback ? cashbackBalance : 0
  const finalAmount = Math.max(0, total - cashbackUsed)
  const margin      = total > 0 ? Math.round(((total - costPrice) / total) * 100) : 0

  useEffect(() => {
    if (form.paymentMode === 'full') {
      const today = new Date().toISOString().slice(0, 10)
      onChange({
        payments: [{
          id: form.payments[0]?.id ?? crypto.randomUUID(),
          amount: formatPriceInput(finalAmount),
          dueDate: today,
          paymentType: form.payments[0]?.paymentType ?? 'cash',
        }],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.paymentMode, form.applyCashback, form.totalAmount])

  const updatePayment = (id: string, patch: Partial<PaymentDraft>) => {
    onChange({ payments: form.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  }

  const addPayment = () => {
    onChange({
      payments: [
        ...form.payments,
        { id: crypto.randomUUID(), amount: '', dueDate: '', paymentType: 'cash' },
      ],
    })
  }

  const removePayment = (id: string) => {
    if (form.payments.length <= 1) return
    onChange({ payments: form.payments.filter((p) => p.id !== id) })
  }

  const paymentsTotal = form.payments.reduce((s, p) => s + parsePriceInput(p.amount), 0)
  const paymentsLeft  = finalAmount - paymentsTotal

  const referrerName = (client as { referrer?: { name: string } } | null)?.referrer?.name

  const paymentModes: [PaymentMode, string][] = [
    ['full',    t.stepPayment.fullPayment],
    ['partial', t.stepPayment.partialPayment],
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* ── Order summary ──────────────────────────────────── */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">{t.stepPayment.orderSummary}</h3>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t.stepPayment.serviceAmount}</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>

          {form.applyCashback && cashbackBalance > 0 && (
            <div className="flex items-center justify-between text-green-700">
              <span className="text-sm">{t.stepPayment.clientCashback}</span>
              <span className="text-sm font-semibold tabular-nums">− {formatCurrency(cashbackBalance)}</span>
            </div>
          )}

          <div className="h-px bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">{t.stepPayment.toPay}</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(finalAmount)}</span>
          </div>

          {costPrice > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t.stepPayment.margin}</span>
              <span className={`text-xs font-semibold ${margin >= 30 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-500'}`}>
                {margin}%
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <PriceInput
            label={t.stepPayment.costPriceLabel}
            value={form.costPrice}
            onChange={(v) => onChange({ costPrice: v })}
            placeholder={t.stepPayment.costPricePlaceholder}
          />
        </div>
      </div>

      {/* ── Cashback card ─────────────────────────────────── */}
      {hasCashback && (
        <div className={`rounded-2xl border p-4 transition-colors ${form.applyCashback ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${form.applyCashback ? 'bg-green-200' : 'bg-gray-100 dark:bg-slate-700'}`}>
                <svg className={`w-5 h-5 ${form.applyCashback ? 'text-green-700' : 'text-gray-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t.stepPayment.clientCashback}</p>
                <p className="text-sm text-green-600 font-bold">{formatCurrency(cashbackBalance)}</p>
                {form.applyCashback && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    {t.stepPayment.totalToPay}: <strong>{formatCurrency(finalAmount)}</strong>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ applyCashback: !form.applyCashback })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                form.applyCashback
                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                  : 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
            >
              {form.applyCashback ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.stepPayment.appliedCashback}
                </>
              ) : (
                <>{t.stepPayment.useCashback}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Payment mode ──────────────────────────────────── */}
      <div className="border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">{t.stepPayment.paymentMethod}</h3>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          {paymentModes.map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ paymentMode: mode })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                form.paymentMode === mode
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
              }`}
            >
              {mode === 'full' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Full mode */}
        {form.paymentMode === 'full' && (
          <div className="flex flex-col gap-3">
            {form.payments.slice(0, 1).map((p) => (
              <div key={p.id} className="grid grid-cols-2 gap-3">
                <Input
                  label={t.stepPayment.paymentDate}
                  type="date"
                  value={p.dueDate}
                  onChange={(e) => updatePayment(p.id, { dueDate: e.target.value })}
                />
                <Select
                  label={t.stepPayment.paymentType}
                  options={paymentTypeOptions}
                  value={p.paymentType}
                  onChange={(e) => updatePayment(p.id, { paymentType: e.target.value as PaymentType })}
                />
              </div>
            ))}
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm">
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-700 dark:text-blue-300">
                {t.stepPayment.fullPayment}: <strong className="tabular-nums">{formatCurrency(finalAmount)}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Partial mode */}
        {form.paymentMode === 'partial' && (
          <div className="flex flex-col gap-3">
            {form.payments.map((p, i) => (
              <div key={p.id} className="flex items-end gap-2 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                <span className="text-sm font-semibold text-gray-400 mb-0.5 shrink-0 w-5">{i + 1}.</span>
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <PriceInput
                    label={i === 0 ? t.stepPayment.amountLabel : undefined}
                    value={p.amount}
                    onChange={(v) => updatePayment(p.id, { amount: v })}
                    placeholder={t.stepPayment.amountLabel}
                  />
                  <Input
                    label={i === 0 ? t.stepPayment.dateLabel : undefined}
                    type="date"
                    value={p.dueDate}
                    onChange={(e) => updatePayment(p.id, { dueDate: e.target.value })}
                  />
                  <Select
                    label={i === 0 ? t.stepPayment.typeLabel : undefined}
                    options={paymentTypeOptions}
                    value={p.paymentType}
                    onChange={(e) => updatePayment(p.id, { paymentType: e.target.value as PaymentType })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePayment(p.id)}
                  disabled={form.payments.length <= 1}
                  className="mb-0.5 text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-lg font-bold"
                >×</button>
              </div>
            ))}

            {/* Running totals */}
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm">
              <span className="text-gray-500 dark:text-slate-400">{t.stepPayment.paymentsEntered}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-gray-900 dark:text-slate-100">{formatCurrency(paymentsTotal)}</span>
                {paymentsLeft > 0 && (
                  <span className="text-xs text-orange-600 font-medium bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    {t.stepPayment.remaining}: {formatCurrency(paymentsLeft)}
                  </span>
                )}
                {paymentsLeft <= 0 && paymentsTotal > 0 && (
                  <span className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    {t.stepPayment.fullyCovered}
                  </span>
                )}
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={addPayment}>
              {t.stepPayment.addPart}
            </Button>
          </div>
        )}
      </div>

      {/* ── Referral info ─────────────────────────────────── */}
      {referrerName && (
        <div className="flex items-center gap-3 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl">
          <div className="w-9 h-9 bg-teal-200 text-teal-700 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
            {referrerName[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">{referrerName}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">{t.stepPayment.referralWillEarn}</p>
          </div>
        </div>
      )}
    </div>
  )
}

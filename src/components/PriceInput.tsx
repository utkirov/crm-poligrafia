import type { KeyboardEvent } from 'react'
import { formatPriceInput } from '../utils/priceInput'

interface PriceInputProps {
  label?: string
  value: string
  onChange: (formatted: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  id?: string
  autoFocus?: boolean
}

/**
 * A controlled price input with space-separated thousands mask.
 * Stores and emits formatted strings like "500 000".
 * Use parsePriceInput() to get the numeric value when saving.
 */
export function PriceInput({
  label,
  value,
  onChange,
  placeholder = '0',
  disabled,
  readOnly,
  className = '',
  id,
  autoFocus,
}: PriceInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatPriceInput(e.target.value))
  }

  // Allow only numeric keys, arrows, backspace, delete, tab, enter
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End']
    const isDigit = /^\d$/.test(e.key)
    const isCtrl = e.ctrlKey || e.metaKey  // allow copy/paste/select-all
    if (!isDigit && !allowed.includes(e.key) && !isCtrl) {
      e.preventDefault()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`
          px-3 py-2 rounded-lg border text-sm tabular-nums
          text-gray-900 dark:text-slate-100
          placeholder:text-gray-400 dark:placeholder:text-slate-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          dark:focus:ring-blue-400
          transition-colors duration-150
          ${readOnly
            ? 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 cursor-default'
            : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'
          }
          ${disabled ? 'bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-slate-600 cursor-not-allowed' : ''}
          ${className}
        `}
      />
    </div>
  )
}

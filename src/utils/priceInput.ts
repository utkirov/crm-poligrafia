/**
 * Format a raw number/string to a price display string with space thousands separators.
 * Example: 500000 → "500 000", "5000" → "5 000"
 */
export function formatPriceInput(value: string | number): string {
  const raw = String(value).replace(/[^\d]/g, '')
  if (!raw) return ''
  const num = parseInt(raw, 10)
  if (isNaN(num)) return ''
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
}

/**
 * Parse a formatted price string back to a number.
 * Example: "500 000" → 500000, "5\u00A0000" → 5000
 */
export function parsePriceInput(formatted: string | undefined | null): number {
  if (!formatted) return 0
  return parseInt(String(formatted).replace(/[\s\u00A0]/g, ''), 10) || 0
}

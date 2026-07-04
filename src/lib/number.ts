// Sanitizes free-text numeric input for type="text" inputMode="decimal" fields.
// iOS Safari's type="number" keypad often lacks a decimal/comma key, so numeric
// inputs use type="text" instead and sanitize as the user types. Normalizes a
// comma (Dutch decimal input) to a dot and strips everything else invalid.
export function sanitizeDecimalInput(raw: string): string {
  let v = raw.replace(',', '.')
  v = v.replace(/[^0-9.]/g, '')
  const firstDot = v.indexOf('.')
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '')
  }
  return v
}

export function parseDecimal(raw: string, fallback = 0): number {
  const n = parseFloat(raw)
  return isNaN(n) ? fallback : n
}

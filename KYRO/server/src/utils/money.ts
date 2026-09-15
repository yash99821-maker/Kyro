/**
 * Money helpers.
 *
 * All amounts in KYRO are rupees stored as numbers with at most 2 decimals.
 * Rounding every computed amount avoids floating-point drift such as
 * 0.1 + 0.2 = 0.30000000000000004 showing up in a balance.
 */

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function formatInr(value: number): string {
  return `₹${roundMoney(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

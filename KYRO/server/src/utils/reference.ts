import crypto from 'node:crypto'

/**
 * Builds a KYRO transaction reference such as `KYROTXN250909F3A81C`.
 * Date prefix keeps references roughly sortable; the random suffix makes
 * collisions effectively impossible.
 */
export function generateReferenceId(prefix = 'KYROTXN'): string {
  const now = new Date()
  const stamp =
    String(now.getFullYear()).slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `${prefix}${stamp}${random}`
}

/** Turns a display name into a KYRO UPI handle, e.g. "Harish Sharma" -> harish.sharma@kyro */
export function buildUpiId(name: string, mobileNumber: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
  const base = slug || `user${mobileNumber.slice(-4)}`
  return `${base}${mobileNumber.slice(-4)}@kyro`
}

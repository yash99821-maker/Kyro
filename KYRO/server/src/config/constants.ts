/**
 * Demo-mode constants.
 *
 * KYRO is a college demonstration project: no real bank, UPI switch or SMS
 * gateway is involved. These fixed values stand in for those external systems
 * so the whole flow can be demonstrated offline.
 */

/** OTP accepted by the simulated SMS verification step. */
export const DEMO_OTP = '123456'

/** Transaction PIN assigned to accounts created through the demo login. */
export const DEFAULT_DEMO_PIN = '1234'

/** Maximum wrong PIN attempts before a payment request is rejected. */
export const MAX_PIN_ATTEMPTS = 5

/** UPI-style handle suffix used for KYRO demo identifiers. */
export const KYRO_UPI_DOMAIN = 'kyro'

export const SPENDING_CATEGORIES = [
  'food',
  'shopping',
  'travel',
  'bills',
  'recharge',
  'entertainment',
  'healthcare',
  'transfer',
  'other',
] as const

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number]

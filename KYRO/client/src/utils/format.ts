import type { SpendingCategory, TransactionType } from '../types'

/** ₹1,24,500.50 — Indian digit grouping, decimals only when they matter. */
export function formatCurrency(value: number, showDecimals = false): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100
  const hasPaise = rounded % 1 !== 0
  return `₹${rounded.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals || hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

/** Compact form for chart axes: ₹1.2K, ₹3.4L */
export function formatCompactCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
  return `₹${Math.round(value)}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`
}

/** "Today", "Yesterday", or a short date — used in transaction rows. */
export function formatRelativeDay(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-IN', { weekday: 'long' })
  return formatDate(iso)
}

/** Bucket label used to group the transaction history. */
export function transactionGroupLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This Week'
  return 'Earlier'
}

export const CATEGORY_LABELS: Record<SpendingCategory, string> = {
  food: 'Food',
  shopping: 'Shopping',
  travel: 'Travel',
  bills: 'Bills',
  recharge: 'Recharge',
  entertainment: 'Entertainment',
  healthcare: 'Healthcare',
  transfer: 'Transfer',
  other: 'Other',
}

/** Chart / chip colour per category. Kept in one place so they never drift. */
export const CATEGORY_COLORS: Record<SpendingCategory, string> = {
  food: '#f97316',
  shopping: '#8b5cf6',
  travel: '#06aed4',
  bills: '#eab308',
  recharge: '#ec4899',
  entertainment: '#a855f7',
  healthcare: '#ef4444',
  transfer: '#3d569c',
  other: '#64748b',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  PAYMENT: 'Payment',
  RECEIVED: 'Received',
  RECHARGE: 'Recharge',
  BILL: 'Bill',
  GROUP: 'Group',
  SAVING: 'Saving',
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/** Deterministic avatar colour so a person keeps the same colour everywhere. */
export function colorForName(name: string): string {
  const palette = [
    '#3d569c',
    '#06aed4',
    '#10b981',
    '#f97316',
    '#8b5cf6',
    '#ec4899',
    '#0ea5e9',
    '#f59e0b',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 100000
  return palette[hash % palette.length]!
}

export function greetingForHour(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

/** Builds the payload encoded in a KYRO QR code. */
export function buildQrPayload(upiId: string, name: string): string {
  return `kyro://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}`
}

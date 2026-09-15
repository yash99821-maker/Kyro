import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clapperboard,
  CreditCard,
  HeartPulse,
  Receipt,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import type { Transaction } from '../types'
import { CATEGORY_LABELS, formatCurrency, formatRelativeDay, formatTime } from '../utils/format'

const CATEGORY_ICONS: Record<string, typeof Wallet> = {
  food: UtensilsCrossed,
  shopping: ShoppingBag,
  travel: CreditCard,
  bills: Receipt,
  recharge: Smartphone,
  entertainment: Clapperboard,
  healthcare: HeartPulse,
  transfer: Wallet,
  other: Wallet,
}

const CATEGORY_STYLES: Record<string, string> = {
  food: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  shopping: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  travel: 'bg-kyro-100 text-kyro-700 dark:bg-kyro-500/15 dark:text-kyro-200',
  bills: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  recharge: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300',
  entertainment: 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300',
  healthcare: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  transfer: 'bg-navy-100 text-navy-700 dark:bg-navy-500/20 dark:text-navy-200',
  other: 'bg-muted text-soft',
}

export default function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.type === 'RECEIVED'
  const party = isCredit ? transaction.sender.name : transaction.receiver.name
  const Icon = isCredit ? ArrowDownLeft : (CATEGORY_ICONS[transaction.category] ?? ArrowUpRight)
  const iconStyle = isCredit
    ? 'bg-mint-100 text-mint-600 dark:bg-mint-500/15 dark:text-mint-300'
    : (CATEGORY_STYLES[transaction.category] ?? CATEGORY_STYLES.other!)

  const isFailed = transaction.status === 'FAILED'

  return (
    <Link
      to={`/transactions/${transaction.id}`}
      className="focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconStyle}`}>
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-strong">{party}</p>
        <p className="truncate text-xs text-soft">
          {CATEGORY_LABELS[transaction.category]} · {formatRelativeDay(transaction.createdAt)},{' '}
          {formatTime(transaction.createdAt)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-bold ${
            isFailed
              ? 'text-soft line-through'
              : isCredit
                ? 'text-mint-600 dark:text-mint-400'
                : 'text-strong'
          }`}
        >
          {isCredit ? '+' : '−'}
          {formatCurrency(transaction.amount)}
        </p>
        {isFailed ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">Failed</span>
        ) : transaction.roundUpAmount > 0 ? (
          <span className="text-[10px] font-semibold text-mint-600 dark:text-mint-400">
            +{formatCurrency(transaction.roundUpAmount)} saved
          </span>
        ) : (
          <span className="text-[10px] font-medium text-soft">
            {transaction.status === 'PENDING' ? 'Pending' : 'Success'}
          </span>
        )}
      </div>
    </Link>
  )
}

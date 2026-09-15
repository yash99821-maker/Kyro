import { PiggyBank } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/format'

/**
 * Shared amount field for every payment flow.
 *
 * It previews the Kyro Save round-up as the user types. The preview uses the
 * same formula the server uses, but it is only a preview — the amount that is
 * actually saved is always calculated and stored by the backend.
 */
export function previewRoundUp(amount: number, roundTo: 10 | 50): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const rounded = Math.ceil(amount / roundTo) * roundTo
  return Math.round((rounded - amount) * 100) / 100
}

interface AmountEntryProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  autoFocus?: boolean
  quickAmounts?: number[]
}

export default function AmountEntry({
  value,
  onChange,
  label = 'Enter amount',
  error,
  autoFocus = true,
  quickAmounts = [100, 500, 1000, 2000],
}: AmountEntryProps) {
  const { user } = useAuth()
  const amount = Number(value)
  const isValid = Number.isFinite(amount) && amount > 0

  const roundUpEnabled = user?.kyroSave.enabled ?? false
  const roundTo = user?.kyroSave.roundUpTo ?? 10
  const saved = roundUpEnabled ? previewRoundUp(amount, roundTo) : 0

  const exceedsBalance = isValid && user ? amount + saved > user.balance : false

  function handleChange(raw: string) {
    // Digits and at most one decimal point, capped at two decimals.
    const cleaned = raw.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const normalised =
      parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
    const [whole = '', decimals] = normalised.split('.')
    if (decimals !== undefined) onChange(`${whole.slice(0, 7)}.${decimals.slice(0, 2)}`)
    else onChange(whole.slice(0, 7))
  }

  return (
    <div className="w-full">
      <label htmlFor="amount-entry" className="mb-2 block text-center text-xs font-semibold text-soft">
        {label}
      </label>

      <div className="flex items-center justify-center gap-1">
        <span className="text-3xl font-bold text-soft">₹</span>
        <input
          id="amount-entry"
          type="text"
          inputMode="decimal"
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="0"
          aria-invalid={Boolean(error)}
          className="w-full max-w-[240px] bg-transparent text-center text-5xl font-extrabold tracking-tight text-strong outline-none placeholder:text-soft/35"
        />
      </div>

      {user && (
        <p className="mt-2 text-center text-xs text-soft">
          Available balance {formatCurrency(user.balance)}
        </p>
      )}

      {/* Kyro Save preview — makes the unique feature visible before paying */}
      {saved > 0 && !exceedsBalance && (
        <div className="animate-fade-up mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 rounded-2xl bg-mint-50 px-4 py-2.5 dark:bg-mint-500/10">
          <PiggyBank size={16} className="shrink-0 text-mint-600 dark:text-mint-400" />
          <p className="text-xs font-medium text-mint-700 dark:text-mint-300">
            Kyro Save will round up to {formatCurrency(Math.ceil(amount / roundTo) * roundTo)} and
            save <span className="font-bold">{formatCurrency(saved)}</span>
          </p>
        </div>
      )}

      {exceedsBalance && (
        <p role="alert" className="mt-3 text-center text-xs font-semibold text-red-500">
          That is more than your available balance of {formatCurrency(user!.balance)}
          {saved > 0 ? ` (including the ${formatCurrency(saved)} round-up)` : ''}.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-center text-xs font-semibold text-red-500">
          {error}
        </p>
      )}

      <div className="no-scrollbar mt-5 flex justify-center gap-2 overflow-x-auto">
        {quickAmounts.map((quick) => (
          <button
            key={quick}
            type="button"
            onClick={() => onChange(String(quick))}
            className="focus-ring shrink-0 rounded-full border border-app px-4 py-2 text-xs font-semibold text-strong transition-colors hover:bg-muted"
          >
            ₹{quick.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
    </div>
  )
}

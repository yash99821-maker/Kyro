import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, PiggyBank, Receipt } from 'lucide-react'
import { Button } from './ui'
import { formatCurrency, formatDate, formatTime } from '../utils/format'
import type { PaymentResult } from '../types'

/**
 * The screen shown after a simulated payment succeeds.
 *
 * Every number here comes from the API response — the amount, the reference
 * id, the new balance and the Kyro Save round-up were all computed on the
 * server, not in the browser.
 */
export default function PaymentSuccess({
  result,
  onDone,
}: {
  result: PaymentResult
  onDone?: () => void
}) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const { transaction, savedAmount } = result

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 60)
    return () => window.clearTimeout(timer)
  }, [])

  const created = transaction.createdAt

  function handleDone() {
    if (onDone) onDone()
    else navigate('/', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[160] flex flex-col overflow-y-auto bg-app">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-10">
        <div
          className={`flex w-full flex-col items-center transition-all duration-500
            ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
        >
          {/* Success tick with an expanding ring */}
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
            <span className="animate-ring absolute inset-0 rounded-full bg-mint-400/35" />
            <span className="animate-pop relative flex h-20 w-20 items-center justify-center rounded-full bg-mint-500 shadow-xl shadow-mint-500/30">
              <Check size={40} strokeWidth={3.5} className="text-white" />
            </span>
          </div>

          <p className="text-sm font-semibold text-soft">Payment Successful</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-strong">
            {formatCurrency(transaction.amount)}
          </p>
          <p className="mt-1.5 text-sm text-soft">
            Paid to <span className="font-semibold text-strong">{transaction.receiver.name}</span>
          </p>

          {/* The Kyro Save moment — the unique feature made visible */}
          {savedAmount > 0 && (
            <div className="kyro-save-gradient animate-fade-up relative mt-6 w-full overflow-hidden rounded-2xl p-4 text-white shadow-lg shadow-mint-700/25">
              {/* falling coins */}
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="animate-coin absolute text-base"
                  style={{ left: `${18 + i * 21}%`, top: '10%', animationDelay: `${i * 0.16}s` }}
                  aria-hidden="true"
                >
                  🪙
                </span>
              ))}
              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <PiggyBank size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {formatCurrency(savedAmount)} added to Kyro Save 🎉
                  </p>
                  <p className="text-xs text-white/75">
                    Rounded up from {formatCurrency(transaction.amount)} — your savings pot is now{' '}
                    {formatCurrency(result.savingsBalance)}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Receipt details */}
          <dl className="kyro-card mt-6 w-full space-y-2.5 p-4">
            {[
              ['Transaction ID', transaction.referenceId],
              ['Date', formatDate(created)],
              ['Time', formatTime(created)],
              ...(transaction.receiver.upiId ? [['UPI ID', transaction.receiver.upiId]] : []),
              ...(transaction.description ? [['Note', transaction.description]] : []),
              ['Updated balance', formatCurrency(result.balance)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <dt className="text-xs text-soft">{label}</dt>
                <dd className="max-w-[60%] break-words text-right text-xs font-semibold text-strong">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex w-full gap-3">
            <Button
              variant="outline"
              fullWidth
              icon={<Receipt size={16} />}
              onClick={() => navigate(`/transactions/${transaction.id}`, { replace: true })}
            >
              View Transaction
            </Button>
            <Button variant="primary" fullWidth onClick={handleDone}>
              Done
            </Button>
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-soft">
            Simulated payment recorded in the KYRO database. No real money was transferred.
          </p>
        </div>
      </div>
    </div>
  )
}

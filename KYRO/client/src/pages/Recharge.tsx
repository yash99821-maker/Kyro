import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import PaymentSuccess from '../components/PaymentSuccess'
import PinPad from '../components/PinPad'
import { Button, Field } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { paymentService } from '../services'
import { getErrorMessage } from '../services/api'
import { formatCurrency } from '../utils/format'
import { previewRoundUp } from '../components/AmountEntry'
import type { PaymentResult } from '../types'

const OPERATORS = ['Airtel', 'Jio', 'Vi', 'BSNL']

/** Typical prepaid packs. Deliberately non-round so round-ups are visible. */
const PLANS = [
  { amount: 239, validity: '28 days', data: '1.5 GB/day', label: 'Popular' },
  { amount: 299, validity: '28 days', data: '2 GB/day', label: '' },
  { amount: 479, validity: '56 days', data: '1.5 GB/day', label: '' },
  { amount: 666, validity: '84 days', data: '1.5 GB/day', label: 'Best value' },
  { amount: 859, validity: '84 days', data: '2 GB/day', label: '' },
  { amount: 155, validity: '24 days', data: '1 GB total', label: 'Budget' },
]

export default function Recharge() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useUi()

  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber ?? '')
  const [operator, setOperator] = useState('Airtel')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [showPinPad, setShowPinPad] = useState(false)
  const [result, setResult] = useState<PaymentResult | null>(null)

  const numericAmount = Number(amount)
  const isValid = /^[0-9]{10}$/.test(mobileNumber) && numericAmount > 0

  const roundUpPreview =
    user?.kyroSave.enabled && numericAmount > 0
      ? previewRoundUp(numericAmount, user.kyroSave.roundUpTo)
      : 0

  async function handlePay(pin: string) {
    try {
      const paymentResult = await paymentService.recharge({
        mobileNumber,
        operator,
        amount: numericAmount,
        pin,
      })
      setShowPinPad(false)
      setResult(paymentResult)
      await refreshUser()
      if (paymentResult.savedAmount > 0) {
        showToast(`₹${paymentResult.savedAmount} added to Kyro Save 🎉`)
      }
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  }

  function handleSubmit() {
    setError('')
    if (!/^[0-9]{10}$/.test(mobileNumber)) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }
    if (!(numericAmount > 0)) {
      setError('Choose a plan or enter a recharge amount.')
      return
    }
    setShowPinPad(true)
  }

  if (result) return <PaymentSuccess result={result} />

  return (
    <div className="min-h-screen bg-app">
      <PageHeader title="Mobile Recharge" subtitle="Prepaid recharge · simulated" />

      <PageBody className="max-w-md">
        <div className="kyro-card p-4">
          <Field
            label="Mobile number"
            type="tel"
            inputMode="numeric"
            prefix={<span className="font-semibold text-strong">+91</span>}
            placeholder="9999999999"
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
          />

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-soft">Operator</p>
            <div className="grid grid-cols-4 gap-2">
              {OPERATORS.map((option) => (
                <button
                  key={option}
                  onClick={() => setOperator(option)}
                  aria-pressed={operator === option}
                  className={`focus-ring rounded-xl px-2 py-2.5 text-xs font-bold transition-colors ${
                    operator === option
                      ? 'bg-navy-800 text-white'
                      : 'border border-app text-soft hover:bg-muted'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-xs font-bold text-soft">CHOOSE A PLAN</p>
          <div className="space-y-2.5">
            {PLANS.map((plan) => (
              <button
                key={plan.amount}
                onClick={() => setAmount(String(plan.amount))}
                aria-pressed={amount === String(plan.amount)}
                className={`focus-ring flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
                  amount === String(plan.amount)
                    ? 'border-kyro-400 bg-kyro-50 dark:bg-kyro-500/10'
                    : 'border-app bg-card hover:bg-muted'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-strong">
                      {formatCurrency(plan.amount)}
                    </span>
                    {plan.label && (
                      <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[9px] font-bold uppercase text-mint-700 dark:bg-mint-500/15 dark:text-mint-300">
                        {plan.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-soft">
                    {plan.data} · {plan.validity}
                  </p>
                </div>
                <Smartphone size={18} className="shrink-0 text-soft" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Field
            label="Or enter a custom amount"
            type="text"
            inputMode="decimal"
            prefix="₹"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 7))}
            error={error}
          />
        </div>

        {roundUpPreview > 0 && (
          <p className="mt-3 text-center text-xs font-medium text-mint-700 dark:text-mint-300">
            🪙 Kyro Save will add {formatCurrency(roundUpPreview)} to your savings pot.
          </p>
        )}

        <Button variant="accent" fullWidth className="mt-6" disabled={!isValid} onClick={handleSubmit}>
          Recharge {numericAmount > 0 ? formatCurrency(numericAmount) : ''}
        </Button>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-soft">
          This is a simulated recharge for a college project. The transaction is stored in the KYRO
          database but no operator is contacted.
        </p>
      </PageBody>

      {showPinPad && (
        <PinPad
          payeeName={`${operator} · ${mobileNumber}`}
          amount={numericAmount}
          onSubmit={handlePay}
          onClose={() => setShowPinPad(false)}
        />
      )}
    </div>
  )
}

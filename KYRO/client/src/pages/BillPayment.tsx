import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import {
  CreditCard,
  Droplets,
  Flame,
  Receipt,
  Shield,
  Tv,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import PaymentSuccess from '../components/PaymentSuccess'
import PinPad from '../components/PinPad'
import { previewRoundUp } from '../components/AmountEntry'
import { Button, Field } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { paymentService } from '../services'
import { getErrorMessage } from '../services/api'
import { formatCurrency } from '../utils/format'
import type { PaymentResult } from '../types'

interface BillConfig {
  title: string
  Icon: LucideIcon
  tint: string
  consumerLabel: string
  consumerPlaceholder: string
  providers: string[]
  /** Plausible amounts so a demo does not need typing. */
  suggested: number[]
}

/**
 * Every supported biller. Adding a new bill type is a matter of adding an
 * entry here — no new page or route is needed.
 */
const BILL_TYPES: Record<string, BillConfig> = {
  electricity: {
    title: 'Electricity Bill',
    Icon: Zap,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    consumerLabel: 'Consumer number',
    consumerPlaceholder: '4402917733',
    providers: ['State Electricity Board', 'Adani Electricity', 'Tata Power', 'BESCOM'],
    suggested: [1454, 872, 2109],
  },
  water: {
    title: 'Water Bill',
    Icon: Droplets,
    tint: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
    consumerLabel: 'Consumer ID',
    consumerPlaceholder: 'WTR88213',
    providers: ['AquaCity Water Works', 'Municipal Water Supply', 'Jal Board'],
    suggested: [799, 462, 1120],
  },
  dth: {
    title: 'DTH Recharge',
    Icon: Tv,
    tint: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300',
    consumerLabel: 'Subscriber ID',
    consumerPlaceholder: '3021847765',
    providers: ['Tata Play', 'Dish TV', 'Airtel Digital TV', 'Sun Direct'],
    suggested: [349, 599, 899],
  },
  gas: {
    title: 'Gas Bill',
    Icon: Flame,
    tint: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    consumerLabel: 'Consumer number',
    consumerPlaceholder: 'GAS4471902',
    providers: ['Indane Gas', 'HP Gas', 'Bharat Gas', 'City Gas Distribution'],
    suggested: [1103, 856, 627],
  },
  broadband: {
    title: 'Broadband Bill',
    Icon: Wifi,
    tint: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
    consumerLabel: 'Account number',
    consumerPlaceholder: 'BB99120345',
    providers: ['Airtel Xstream', 'JioFiber', 'ACT Fibernet', 'BSNL Broadband'],
    suggested: [799, 1177, 1499],
  },
  fastag: {
    title: 'FASTag Recharge',
    Icon: CreditCard,
    tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    consumerLabel: 'Vehicle number',
    consumerPlaceholder: 'MH12AB1234',
    providers: ['KYRO FASTag', 'ICICI FASTag', 'HDFC FASTag', 'Paytm FASTag'],
    suggested: [500, 1000, 1500],
  },
  insurance: {
    title: 'Insurance Premium',
    Icon: Shield,
    tint: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
    consumerLabel: 'Policy number',
    consumerPlaceholder: 'POL77219034',
    providers: ['LIC of India', 'HDFC Life', 'ICICI Prudential', 'Star Health'],
    suggested: [2499, 5133, 8760],
  },
  'credit-card': {
    title: 'Credit Card Bill',
    Icon: Receipt,
    tint: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    consumerLabel: 'Last 4 digits of card',
    consumerPlaceholder: '4417',
    providers: ['HDFC Bank', 'ICICI Bank', 'SBI Card', 'Axis Bank'],
    suggested: [3247, 8912, 15430],
  },
}

export default function BillPayment() {
  const { billType = '' } = useParams()
  const config = BILL_TYPES[billType]

  const { user, refreshUser } = useAuth()
  const { showToast } = useUi()

  const [provider, setProvider] = useState(config?.providers[0] ?? '')
  const [consumerNumber, setConsumerNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<{ consumer?: string; amount?: string }>({})
  const [showPinPad, setShowPinPad] = useState(false)
  const [result, setResult] = useState<PaymentResult | null>(null)

  // An unknown bill type in the URL should never render a broken page.
  if (!config) return <Navigate to="/payments" replace />

  const numericAmount = Number(amount)
  const roundUpPreview =
    user?.kyroSave.enabled && numericAmount > 0
      ? previewRoundUp(numericAmount, user.kyroSave.roundUpTo)
      : 0

  function validate(): boolean {
    const next: typeof errors = {}
    if (!consumerNumber.trim()) next.consumer = `Enter your ${config!.consumerLabel.toLowerCase()}.`
    if (!(numericAmount > 0)) next.amount = 'Enter a valid bill amount.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handlePay(pin: string) {
    try {
      const paymentResult = await paymentService.payBill({
        billType,
        provider,
        consumerNumber: consumerNumber.trim(),
        amount: numericAmount,
        pin,
      })
      setShowPinPad(false)
      setResult(paymentResult)
      await refreshUser()
      if (paymentResult.savedAmount > 0) {
        showToast(`₹${paymentResult.savedAmount} added to Kyro Save 🎉`)
      }
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  if (result) return <PaymentSuccess result={result} />

  const { Icon, tint } = config

  return (
    <div className="min-h-screen bg-app">
      <PageHeader title={config.title} subtitle="Simulated bill payment" />

      <PageBody className="max-w-md">
        <div className="kyro-card flex items-center gap-3 p-4">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
            <Icon size={22} />
          </span>
          <div>
            <p className="text-sm font-bold text-strong">{config.title}</p>
            <p className="text-xs text-soft">Pay instantly from your KYRO balance</p>
          </div>
        </div>

        <div className="kyro-card mt-4 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-soft">Provider</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {config.providers.map((option) => (
                <button
                  key={option}
                  onClick={() => setProvider(option)}
                  aria-pressed={provider === option}
                  className={`focus-ring rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                    provider === option
                      ? 'bg-navy-800 text-white'
                      : 'border border-app text-soft hover:bg-muted'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Field
              label={config.consumerLabel}
              placeholder={config.consumerPlaceholder}
              value={consumerNumber}
              onChange={(event) => setConsumerNumber(event.target.value)}
              error={errors.consumer}
            />
          </div>

          <div className="mt-4">
            <Field
              label="Bill amount"
              type="text"
              inputMode="decimal"
              prefix="₹"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 8))}
              error={errors.amount}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {config.suggested.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setAmount(String(suggestion))}
                  className="focus-ring rounded-full border border-app px-3.5 py-1.5 text-xs font-semibold text-strong transition-colors hover:bg-muted"
                >
                  {formatCurrency(suggestion)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {user && numericAmount > 0 && (
          <div className="kyro-card mt-4 space-y-2 p-4">
            <div className="flex justify-between text-xs">
              <span className="text-soft">Bill amount</span>
              <span className="font-semibold text-strong">{formatCurrency(numericAmount)}</span>
            </div>
            {roundUpPreview > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-soft">Kyro Save round-up</span>
                <span className="font-semibold text-mint-600 dark:text-mint-400">
                  +{formatCurrency(roundUpPreview)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-app pt-2 text-sm">
              <span className="font-semibold text-strong">Total debited</span>
              <span className="font-extrabold text-strong">
                {formatCurrency(numericAmount + roundUpPreview)}
              </span>
            </div>
          </div>
        )}

        <Button
          variant="accent"
          fullWidth
          className="mt-6"
          onClick={() => validate() && setShowPinPad(true)}
        >
          Pay {numericAmount > 0 ? formatCurrency(numericAmount) : 'bill'}
        </Button>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-soft">
          Simulated for this college project. The payment is recorded in the KYRO database but no
          real biller is contacted.
        </p>
      </PageBody>

      {showPinPad && (
        <PinPad
          payeeName={provider}
          amount={numericAmount}
          onSubmit={handlePay}
          onClose={() => setShowPinPad(false)}
        />
      )}
    </div>
  )
}

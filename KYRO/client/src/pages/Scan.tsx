import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Image, QrCode, ScanLine, Store } from 'lucide-react'
import AmountEntry from '../components/AmountEntry'
import PaymentSuccess from '../components/PaymentSuccess'
import PinPad from '../components/PinPad'
import { Button, Field } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { paymentService } from '../services'
import { getErrorMessage } from '../services/api'
import { CATEGORY_LABELS } from '../utils/format'
import type { PaymentResult, SpendingCategory } from '../types'

/**
 * DEMO SCOPE: a browser page cannot open a phone camera reliably across every
 * device a project is demonstrated on, so scanning is simulated by picking a
 * sample KYRO QR code or pasting a payload. The payload is then resolved and
 * paid through exactly the same backend endpoints a real scan would use.
 */
const SAMPLE_CODES = [
  { name: 'Cafe Mocha', upiId: 'cafemocha@kyro', emoji: '☕', category: 'food' as SpendingCategory },
  { name: 'Spice Garden', upiId: 'spicegarden@kyro', emoji: '🍽️', category: 'food' as SpendingCategory },
  { name: 'Daily Groceries', upiId: 'dailygrocer@kyro', emoji: '🛒', category: 'food' as SpendingCategory },
  { name: 'City Metro', upiId: 'citymetro@kyro', emoji: '🚇', category: 'travel' as SpendingCategory },
  { name: 'BookNook', upiId: 'booknook@kyro', emoji: '📚', category: 'shopping' as SpendingCategory },
  { name: 'PVR Cineplex', upiId: 'pvrcine@kyro', emoji: '🎬', category: 'entertainment' as SpendingCategory },
]

type Step = 'scan' | 'amount'

interface ScannedTarget {
  name: string
  upiId: string
  verified: boolean
  payload: string
}

export default function Scan() {
  const { refreshUser } = useAuth()
  const { showToast } = useUi()

  const [step, setStep] = useState<Step>('scan')
  const [target, setTarget] = useState<ScannedTarget | null>(null)
  const [manualPayload, setManualPayload] = useState('')
  const [scanError, setScanError] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<SpendingCategory>('other')
  const [showPinPad, setShowPinPad] = useState(false)
  const [result, setResult] = useState<PaymentResult | null>(null)

  async function resolve(payload: string, presetCategory?: SpendingCategory) {
    setScanError('')
    setIsResolving(true)
    try {
      const resolved = await paymentService.resolveQr(payload)
      setTarget({ ...resolved, payload })
      if (presetCategory) setCategory(presetCategory)
      setStep('amount')
    } catch (error) {
      setScanError(getErrorMessage(error))
    } finally {
      setIsResolving(false)
    }
  }

  async function handlePay(pin: string) {
    if (!target) return
    try {
      const paymentResult = await paymentService.scan({
        qrPayload: target.payload,
        amount: Number(amount),
        note: note.trim(),
        category,
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

  const numericAmount = Number(amount)

  return (
    <div className="min-h-screen bg-app">
      <PageHeader
        title={step === 'scan' ? 'Scan & Pay' : `Paying ${target?.name ?? ''}`}
        subtitle={step === 'scan' ? 'Pay any KYRO merchant or person' : target?.upiId}
        onBack={step === 'amount' ? () => setStep('scan') : undefined}
      />

      <PageBody>
        {step === 'scan' ? (
          <div className="mx-auto max-w-md">
            {/* Scanner viewfinder */}
            <div className="kyro-gradient relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl">
              <div className="relative h-52 w-52">
                {['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl',
                  'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
                  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
                  'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
                ].map((corner) => (
                  <span key={corner} className={`absolute h-10 w-10 border-kyro-400 ${corner}`} />
                ))}
                <ScanLine size={44} className="absolute inset-0 m-auto text-white/25" />
              </div>
              <p className="absolute bottom-6 px-8 text-center text-xs text-white/60">
                Camera scanning is simulated in this college demo. Pick a sample KYRO code below.
              </p>
            </div>

            <div className="mt-6">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-soft">
                <Store size={13} /> SAMPLE KYRO QR CODES
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SAMPLE_CODES.map((code) => (
                  <button
                    key={code.upiId}
                    disabled={isResolving}
                    onClick={() =>
                      resolve(
                        `kyro://pay?pa=${encodeURIComponent(code.upiId)}&pn=${encodeURIComponent(code.name)}`,
                        code.category,
                      )
                    }
                    className="kyro-card focus-ring flex items-center gap-3 p-3.5 text-left transition-all hover:border-kyro-300 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                      {code.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-strong">{code.name}</p>
                      <p className="truncate text-[11px] text-soft">{code.upiId}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 kyro-card p-4">
              <Field
                label="Or paste a KYRO QR payload"
                placeholder="kyro://pay?pa=name1234@kyro&pn=Name"
                prefix={<QrCode size={15} />}
                value={manualPayload}
                onChange={(event) => setManualPayload(event.target.value)}
                error={scanError}
                hint="A KYRO QR payload, or just a KYRO UPI ID."
              />
              <Button
                variant="outline"
                fullWidth
                className="mt-3"
                isLoading={isResolving}
                disabled={!manualPayload.trim()}
                onClick={() => resolve(manualPayload.trim())}
              >
                Read code
              </Button>
            </div>

            <Link
              to="/my-qr"
              className="kyro-card focus-ring mt-4 flex items-center gap-3 p-4 transition-colors hover:bg-muted"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-white">
                <Image size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-strong">Show my QR code</p>
                <p className="text-xs text-soft">Let someone pay you instead</p>
              </div>
            </Link>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-soft">
              These QR codes represent KYRO demo accounts. They are not connected to real UPI
              infrastructure.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <div className="kyro-card mb-6 flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
                <Store size={19} className="text-soft" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-strong">{target?.name}</p>
                <p className="truncate text-xs text-soft">{target?.upiId}</p>
              </div>
              {target?.verified && (
                <span className="flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-1 text-[10px] font-bold text-mint-700 dark:bg-mint-500/15 dark:text-mint-300">
                  <Check size={11} /> Verified
                </span>
              )}
            </div>

            <div className="kyro-card p-6">
              <AmountEntry value={amount} onChange={setAmount} />
            </div>

            <div className="mt-5">
              <Field
                label="Note (optional)"
                placeholder="Add a note"
                maxLength={140}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-soft">Category</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {(['food', 'shopping', 'travel', 'entertainment', 'healthcare', 'other'] as SpendingCategory[]).map(
                  (option) => (
                    <button
                      key={option}
                      onClick={() => setCategory(option)}
                      aria-pressed={category === option}
                      className={`focus-ring shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                        category === option
                          ? 'bg-navy-800 text-white'
                          : 'border border-app text-soft hover:bg-muted'
                      }`}
                    >
                      {CATEGORY_LABELS[option]}
                    </button>
                  ),
                )}
              </div>
            </div>

            <Button
              variant="accent"
              fullWidth
              className="mt-7"
              disabled={!Number.isFinite(numericAmount) || numericAmount <= 0}
              onClick={() => setShowPinPad(true)}
            >
              Proceed to pay
            </Button>
          </div>
        )}
      </PageBody>

      {showPinPad && target && (
        <PinPad
          payeeName={target.name}
          amount={numericAmount}
          onSubmit={handlePay}
          onClose={() => setShowPinPad(false)}
        />
      )}
    </div>
  )
}

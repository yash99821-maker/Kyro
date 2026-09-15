import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AtSign, Check, Search, Users } from 'lucide-react'
import AmountEntry from '../components/AmountEntry'
import PaymentSuccess from '../components/PaymentSuccess'
import PinPad from '../components/PinPad'
import { Avatar, Button, EmptyState, ErrorState, Field, ListSkeleton } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { useApiResource } from '../hooks/useApiResource'
import { paymentService, userService } from '../services'
import { getErrorMessage } from '../services/api'
import { CATEGORY_LABELS, colorForName, initialsOf } from '../utils/format'
import type { DirectoryUser, PaymentResult, SpendingCategory } from '../types'

type Step = 'recipient' | 'amount'

const CATEGORY_OPTIONS: SpendingCategory[] = [
  'transfer',
  'food',
  'shopping',
  'travel',
  'entertainment',
  'healthcare',
  'other',
]

export default function SendMoney() {
  const location = useLocation() as { state?: { recipient?: DirectoryUser } }
  const { refreshUser } = useAuth()
  const { showToast } = useUi()

  const [step, setStep] = useState<Step>(location.state?.recipient ? 'amount' : 'recipient')
  const [recipient, setRecipient] = useState<DirectoryUser | null>(
    location.state?.recipient ?? null,
  )
  const [search, setSearch] = useState('')
  const [upiSearch, setUpiSearch] = useState('')
  const [upiError, setUpiError] = useState('')
  const [isResolvingUpi, setIsResolvingUpi] = useState(false)

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<SpendingCategory>('transfer')
  const [showPinPad, setShowPinPad] = useState(false)
  const [result, setResult] = useState<PaymentResult | null>(null)

  const directory = useApiResource(() => userService.directory(), [])

  const filtered = useMemo(() => {
    const people = directory.data ?? []
    if (!search.trim()) return people
    const term = search.trim().toLowerCase()
    return people.filter(
      (person) =>
        person.name.toLowerCase().includes(term) ||
        person.upiId.toLowerCase().includes(term) ||
        person.mobileNumber.includes(term),
    )
  }, [directory.data, search])

  /** Resolves a typed UPI handle through the backend before allowing payment. */
  async function handleUpiLookup() {
    const value = upiSearch.trim().toLowerCase()
    setUpiError('')
    if (!value.includes('@')) {
      setUpiError('Enter a full UPI ID, for example name1234@kyro')
      return
    }

    setIsResolvingUpi(true)
    try {
      const found = await userService.lookupUpi(value)
      if (!found.found) {
        setUpiError('No KYRO account is registered with that UPI ID.')
        return
      }
      setRecipient({
        id: value,
        name: found.name!,
        upiId: found.upiId!,
        mobileNumber: '',
        profileImage: '',
      })
      setStep('amount')
    } catch (error) {
      setUpiError(getErrorMessage(error))
    } finally {
      setIsResolvingUpi(false)
    }
  }

  /**
   * Submits the payment. The PIN goes straight to the backend, which verifies
   * it, checks the balance, applies the Kyro Save round-up and writes the
   * transaction. Nothing financial is decided here.
   */
  async function handlePay(pin: string) {
    if (!recipient) return
    const payload = {
      receiverName: recipient.name,
      receiverUpiId: recipient.upiId,
      amount: Number(amount),
      note: note.trim(),
      category,
      pin,
    }

    try {
      const paymentResult = await paymentService.send(payload)
      setShowPinPad(false)
      setResult(paymentResult)
      await refreshUser()
      if (paymentResult.savedAmount > 0) {
        showToast(`₹${paymentResult.savedAmount} added to Kyro Save 🎉`)
      }
    } catch (error) {
      // Rethrown so the PIN pad can show the reason inline and let them retry.
      throw new Error(getErrorMessage(error))
    }
  }

  if (result) return <PaymentSuccess result={result} />

  const numericAmount = Number(amount)
  const canContinue = Number.isFinite(numericAmount) && numericAmount > 0

  return (
    <div className="min-h-screen bg-app">
      <PageHeader
        title={step === 'recipient' ? 'Send Money' : `Paying ${recipient?.name ?? ''}`}
        subtitle={step === 'recipient' ? 'Choose who you want to pay' : recipient?.upiId}
        onBack={step === 'amount' ? () => setStep('recipient') : undefined}
      />

      <PageBody>
        {step === 'recipient' ? (
          <>
            <Field
              label="Search people"
              placeholder="Search by name, UPI ID or mobile number"
              prefix={<Search size={16} />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="mt-5">
              <p className="mb-3 text-xs font-bold text-soft">KYRO CONTACTS</p>
              {directory.isLoading ? (
                <ListSkeleton rows={5} />
              ) : directory.error ? (
                <ErrorState message={directory.error} onRetry={directory.reload} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Users size={26} />}
                  title="No matching contacts"
                  description="Try a different name, or pay directly using a UPI ID below."
                />
              ) : (
                <div className="kyro-card divide-y divide-[color:var(--surface-border)] p-1">
                  {filtered.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => {
                        setRecipient(person)
                        setStep('amount')
                      }}
                      className="focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <Avatar
                        name={initialsOf(person.name)}
                        color={colorForName(person.name)}
                        image={person.profileImage || undefined}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-strong">{person.name}</p>
                        <p className="truncate text-xs text-soft">{person.upiId}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-bold text-soft">OR PAY TO A UPI ID</p>
              <div className="kyro-card p-4">
                <Field
                  label="KYRO UPI ID"
                  placeholder="name1234@kyro"
                  prefix={<AtSign size={15} />}
                  value={upiSearch}
                  onChange={(event) => setUpiSearch(event.target.value)}
                  error={upiError}
                />
                <Button
                  variant="outline"
                  fullWidth
                  className="mt-3"
                  isLoading={isResolvingUpi}
                  onClick={handleUpiLookup}
                >
                  Verify UPI ID
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-md">
            <div className="kyro-card mb-6 flex items-center gap-3 p-4">
              <Avatar
                name={initialsOf(recipient?.name ?? '')}
                color={colorForName(recipient?.name ?? '')}
                image={recipient?.profileImage || undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-strong">{recipient?.name}</p>
                <p className="truncate text-xs text-soft">{recipient?.upiId}</p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-1 text-[10px] font-bold text-mint-700 dark:bg-mint-500/15 dark:text-mint-300">
                <Check size={11} /> Verified
              </span>
            </div>

            <div className="kyro-card p-6">
              <AmountEntry value={amount} onChange={setAmount} />
            </div>

            <div className="mt-5">
              <Field
                label="Note (optional)"
                placeholder="What is this payment for?"
                maxLength={140}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-soft">Category</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {CATEGORY_OPTIONS.map((option) => (
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
                ))}
              </div>
              <p className="mt-2 text-[11px] text-soft">
                Categories power your Kyro AI spending insights.
              </p>
            </div>

            <Button
              variant="accent"
              fullWidth
              className="mt-7"
              disabled={!canContinue}
              onClick={() => setShowPinPad(true)}
            >
              Proceed to pay
            </Button>
          </div>
        )}
      </PageBody>

      {showPinPad && recipient && (
        <PinPad
          payeeName={recipient.name}
          amount={numericAmount}
          onSubmit={handlePay}
          onClose={() => setShowPinPad(false)}
        />
      )}
    </div>
  )
}

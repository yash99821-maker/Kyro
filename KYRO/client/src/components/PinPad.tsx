import { useCallback, useEffect, useRef, useState } from 'react'
import { Delete, Loader2, ShieldCheck, X } from 'lucide-react'
import { formatCurrency } from '../utils/format'

interface PinPadProps {
  /** Who is being paid — shown so the user confirms before entering the PIN. */
  payeeName: string
  amount: number
  /**
   * Receives the entered PIN. The PIN is verified by the BACKEND against a
   * bcrypt hash; this component never knows the correct value. Reject by
   * throwing, and the message is shown inline.
   */
  onSubmit: (pin: string) => Promise<void>
  onClose: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export default function PinPad({ payeeName, amount, onSubmit, onClose }: PinPadProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // `onSubmit` is typically an inline arrow function, so it changes identity on
  // every render. Reading it through a ref keeps submission out of the effect
  // dependency list — an earlier version submitted from an effect and a
  // re-render mid-request left the keypad permanently disabled.
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  // Guards against a second submission while one is already in flight, without
  // waiting for the isSubmitting state to be committed.
  const inFlight = useRef(false)

  const submit = useCallback(async (candidate: string) => {
    if (inFlight.current) return
    inFlight.current = true
    setIsSubmitting(true)
    setError('')

    try {
      await onSubmitRef.current(candidate)
      // On success the parent unmounts this component, so nothing to reset.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That PIN was not accepted.')
      setPin('')
    } finally {
      inFlight.current = false
      setIsSubmitting(false)
    }
  }, [])

  const addDigit = useCallback(
    (digit: string) => {
      setPin((current) => {
        if (inFlight.current || current.length >= 4) return current
        const next = current + digit
        // Auto-submit as soon as the fourth digit lands.
        if (next.length === 4) window.setTimeout(() => void submit(next), 140)
        return next
      })
    },
    [submit],
  )

  // Physical keyboard support — this is a form, not just a touch target.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (inFlight.current) return
      if (/^[0-9]$/.test(event.key)) addDigit(event.key)
      else if (event.key === 'Backspace') setPin((p) => p.slice(0, -1))
      else if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [addDigit, onClose])

  function press(key: string) {
    if (isSubmitting) return
    if (key === 'del') {
      setPin((p) => p.slice(0, -1))
      return
    }
    addDigit(key)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enter transaction PIN"
      className="fixed inset-0 z-[150] flex items-end justify-center bg-navy-950/70 backdrop-blur-sm sm:items-center"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        className="animate-sheet w-full max-w-md rounded-t-3xl bg-card pb-8 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-3 mb-4 h-1 w-10 rounded-full bg-muted sm:hidden" />

        <div className="px-6 pb-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={19} className="text-mint-500" />
              <h2 className="font-bold text-strong">Enter KYRO PIN</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Cancel payment"
              className="focus-ring rounded-full p-1.5 text-soft transition-colors hover:bg-muted disabled:opacity-40"
            >
              <X size={17} />
            </button>
          </div>
          <p className="text-sm text-soft">
            Paying <span className="font-semibold text-strong">{formatCurrency(amount)}</span> to{' '}
            <span className="font-semibold text-strong">{payeeName}</span>
          </p>
        </div>

        <div className={`mb-5 flex justify-center gap-4 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150
                ${
                  index < pin.length
                    ? 'scale-110 border-kyro-500 bg-kyro-500'
                    : 'border-navy-200 dark:border-navy-600'
                }`}
            />
          ))}
        </div>

        {isSubmitting && (
          <p className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-soft">
            <Loader2 size={15} className="animate-spin" /> Verifying with KYRO...
          </p>
        )}

        {error && !isSubmitting && (
          <p role="alert" className="mb-4 px-6 text-center text-sm font-medium text-red-500">
            {error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2.5 px-6">
          {KEYS.map((key, index) => (
            <button
              key={index}
              onClick={() => key && press(key)}
              disabled={!key || isSubmitting}
              aria-label={key === 'del' ? 'Delete' : key || undefined}
              className={`focus-ring flex h-14 items-center justify-center rounded-2xl text-xl font-bold transition-all
                ${
                  key
                    ? 'bg-muted text-strong active:scale-95 disabled:opacity-40'
                    : 'pointer-events-none opacity-0'
                }`}
            >
              {key === 'del' ? <Delete size={20} className="text-soft" /> : key}
            </button>
          ))}
        </div>

        <p className="mt-5 px-6 text-center text-[11px] leading-relaxed text-soft">
          Your PIN is verified on the KYRO server against a hashed value. It is never stored in
          the browser.
        </p>
      </div>
    </div>
  )
}

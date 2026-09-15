import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BarChart3, PiggyBank, ShieldCheck, Users } from 'lucide-react'
import Logo from '../components/Logo'
import { Button, DemoNotice, Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { authService } from '../services'
import { getErrorMessage } from '../services/api'

const FEATURES = [
  {
    Icon: PiggyBank,
    title: 'Kyro Save',
    description: 'Every payment rounds up. The change becomes savings.',
  },
  {
    Icon: Users,
    title: 'Kyro Groups',
    description: 'Split bills, track dues and settle up without the awkwardness.',
  },
  {
    Icon: BarChart3,
    title: 'Kyro AI',
    description: 'Understand where your money goes, automatically.',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast } = useUi()

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile')
  const [mobileNumber, setMobileNumber] = useState('')
  const [name, setName] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  const otpInputRef = useRef<HTMLInputElement>(null)

  // Resend cooldown, exactly as a real OTP screen would behave.
  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus()
  }, [step])

  async function handleRequestOtp(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!/^[0-9]{10}$/.test(mobileNumber)) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await authService.requestOtp(mobileNumber)
      setIsNewUser(!result.isExistingUser)
      setStep('otp')
      setResendIn(30)
      showToast(`Verification code sent to +91 ${mobileNumber}`, 'info')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!/^[0-9]{6}$/.test(otp)) {
      setError('Enter the 6-digit verification code.')
      return
    }
    if (isNewUser && name.trim().length < 2) {
      setError('Please tell us your name to create your KYRO account.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await authService.verifyOtp(
        mobileNumber,
        otp,
        isNewUser ? name.trim() : undefined,
      )
      login(result.token, result.user)
      showToast(
        result.isNewUser
          ? `Welcome to KYRO, ${result.user.name.split(' ')[0]}!`
          : `Welcome back, ${result.user.name.split(' ')[0]}!`,
      )
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setOtp('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ---------- Brand panel ---------- */}
      <section className="kyro-gradient relative flex flex-col justify-between overflow-hidden px-6 py-10 text-white lg:w-1/2 lg:px-14 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-kyro-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-mint-400/15 blur-3xl"
        />

        <div className="relative">
          <Logo size={42} light />
          <h1 className="mt-10 text-3xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Payments that
            <br />
            grow your money.
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/70 lg:text-base">
            KYRO is a smart digital payments and money management platform — pay, split, save and
            understand your spending, all in one place.
          </p>
        </div>

        <ul className="relative mt-10 space-y-3 lg:mt-0">
          {FEATURES.map(({ Icon, title, description }) => (
            <li key={title} className="flex items-start gap-3 rounded-2xl bg-white/[0.07] p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-kyro-200">
                <Icon size={19} />
              </span>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-white/65">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Auth panel ---------- */}
      <section className="flex flex-1 items-center justify-center bg-app px-5 py-10">
        <div className="w-full max-w-sm">
          {step === 'mobile' ? (
            <form onSubmit={handleRequestOtp} noValidate>
              <h2 className="text-2xl font-extrabold tracking-tight text-strong">Sign in to KYRO</h2>
              <p className="mt-1.5 text-sm text-soft">
                Enter your mobile number and we will send you a verification code.
              </p>

              <div className="mt-7">
                <Field
                  label="Mobile number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus
                  prefix={<span className="font-semibold text-strong">+91</span>}
                  placeholder="9999999999"
                  value={mobileNumber}
                  onChange={(event) =>
                    setMobileNumber(event.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  error={error}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                className="mt-5"
                isLoading={isSubmitting}
                icon={!isSubmitting ? <ArrowRight size={17} /> : undefined}
              >
                Continue
              </Button>

              <div className="mt-6 rounded-2xl border border-dashed border-app p-4">
                <p className="mb-1 text-xs font-bold text-strong">Demo account</p>
                <p className="text-xs leading-relaxed text-soft">
                  Sign in with <span className="font-semibold text-strong">9999999999</span> to
                  explore the seeded KYRO demo data, or use any 10-digit number to create a fresh
                  account.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify} noValidate>
              <button
                type="button"
                onClick={() => {
                  setStep('mobile')
                  setOtp('')
                  setError('')
                }}
                className="focus-ring -ml-1 mb-5 flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-soft transition-colors hover:text-strong"
              >
                <ArrowLeft size={15} /> Change number
              </button>

              <h2 className="text-2xl font-extrabold tracking-tight text-strong">Verify your number</h2>
              <p className="mt-1.5 text-sm text-soft">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-strong">+91 {mobileNumber}</span>
              </p>

              {isNewUser && (
                <div className="mt-6">
                  <Field
                    label="Your name"
                    placeholder="e.g. Harish Sharma"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    hint="This is how you will appear to people you pay."
                  />
                </div>
              )}

              <div className="mt-5">
                <Field
                  label="Verification code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  className="tracking-[0.5em] text-center text-lg font-bold"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  error={error}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                className="mt-5"
                isLoading={isSubmitting}
              >
                Verify &amp; continue
              </Button>

              <button
                type="button"
                disabled={resendIn > 0 || isSubmitting}
                onClick={() => {
                  setResendIn(30)
                  void authService.requestOtp(mobileNumber)
                  showToast('A new code has been sent.', 'info')
                }}
                className="focus-ring mt-4 w-full rounded-xl py-2 text-xs font-semibold text-soft transition-colors hover:text-strong disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>

              <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-kyro-50 p-3.5 dark:bg-kyro-500/10">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-kyro-600 dark:text-kyro-300" />
                <p className="text-xs leading-relaxed text-soft">
                  No SMS service is connected in this college project. Use the demo code{' '}
                  <span className="font-bold text-strong">123456</span> — it is still verified by
                  the KYRO backend, not by the browser.
                </p>
              </div>
            </form>
          )}

          <DemoNotice className="mt-8" />
        </div>
      </section>
    </div>
  )
}

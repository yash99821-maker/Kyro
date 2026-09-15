import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  PiggyBank,
  Shield,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { Button, Field, SectionHeader } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { savingsService, userService } from '../services'
import { getErrorMessage } from '../services/api'

/**
 * Notification and privacy toggles are per-device UI preferences, so they are
 * kept in localStorage. Anything that affects money — the PIN, Kyro Save —
 * goes through the API and is stored in MongoDB.
 */
const PREFS_KEY = 'kyro.preferences'

interface Preferences {
  paymentAlerts: boolean
  savingAlerts: boolean
  groupAlerts: boolean
  insightAlerts: boolean
  hideBalanceOnHome: boolean
  language: string
}

const DEFAULT_PREFERENCES: Preferences = {
  paymentAlerts: true,
  savingAlerts: true,
  groupAlerts: true,
  insightAlerts: true,
  hideBalanceOnHome: false,
  language: 'English',
}

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) }
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFERENCES
}

const LANGUAGES = ['English', 'हिन्दी', 'मराठी', 'తెలుగు']

export default function Settings() {
  const { user, logout, refreshUser } = useAuth()
  const { isDark, toggleTheme, showToast } = useUi()

  const [prefs, setPrefs] = useState<Preferences>(loadPreferences)
  const [showPinForm, setShowPinForm] = useState(false)

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  async function toggleKyroSave() {
    if (!user) return
    try {
      await savingsService.updateSettings({ enabled: !user.kyroSave.enabled })
      await refreshUser()
      showToast(user.kyroSave.enabled ? 'Kyro Save turned off' : 'Kyro Save turned on')
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <PageHeader title="Settings" subtitle="Security, preferences and support" />

      <PageBody>
        {/* ---------- Security ---------- */}
        <section className="mb-6">
          <SectionHeader title="Security" />
          <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
            <button
              onClick={() => setShowPinForm((value) => !value)}
              className="focus-ring flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-muted"
            >
              <IconBadge Icon={KeyRound} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">Transaction PIN</p>
                <p className="text-xs text-soft">Change your 4-digit payment PIN</p>
              </div>
              <ChevronRight
                size={17}
                className={`shrink-0 text-soft transition-transform ${showPinForm ? 'rotate-90' : ''}`}
              />
            </button>

            {showPinForm && <ChangePinForm onDone={() => setShowPinForm(false)} />}

            <div className="flex items-center gap-3.5 p-4">
              <IconBadge Icon={Lock} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">PIN storage</p>
                <p className="text-xs text-soft">
                  Your PIN is stored as a bcrypt hash on the server and verified there — never in
                  the browser.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4">
              <IconBadge Icon={Shield} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">Hide balance on home</p>
                <p className="text-xs text-soft">Start the dashboard with your balance masked</p>
              </div>
              <Toggle
                checked={prefs.hideBalanceOnHome}
                label="Hide balance on home"
                onChange={(value) => updatePreference('hideBalanceOnHome', value)}
              />
            </div>
          </div>
        </section>

        {/* ---------- Kyro Save ---------- */}
        <section className="mb-6">
          <SectionHeader title="Kyro Save" />
          <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
            <div className="flex items-center gap-3.5 p-4">
              <IconBadge Icon={PiggyBank} tone="mint" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">Automatic round-ups</p>
                <p className="text-xs text-soft">
                  {user?.kyroSave.enabled
                    ? `On · rounding to the nearest ₹${user.kyroSave.roundUpTo}`
                    : 'Off · payments will not round up'}
                </p>
              </div>
              <Toggle
                checked={user?.kyroSave.enabled ?? false}
                label="Kyro Save"
                onChange={toggleKyroSave}
              />
            </div>
            <Link
              to="/save"
              className="focus-ring flex items-center gap-3.5 p-4 transition-colors hover:bg-muted"
            >
              <IconBadge Icon={PiggyBank} tone="mint" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">Round-up amount &amp; goal</p>
                <p className="text-xs text-soft">Open Kyro Save to change these</p>
              </div>
              <ChevronRight size={17} className="shrink-0 text-soft" />
            </Link>
          </div>
        </section>

        {/* ---------- Notifications ---------- */}
        <section className="mb-6">
          <SectionHeader title="Notifications" />
          <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
            {(
              [
                ['paymentAlerts', 'Payment alerts', 'When a payment succeeds or fails'],
                ['savingAlerts', 'Kyro Save alerts', 'When a round-up is added to your pot'],
                ['groupAlerts', 'Group alerts', 'New expenses and settlements'],
                ['insightAlerts', 'Kyro AI alerts', 'Weekly spending insights'],
              ] as Array<[keyof Preferences, string, string]>
            ).map(([key, label, description]) => (
              <div key={key} className="flex items-center gap-3.5 p-4">
                <IconBadge Icon={Bell} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-strong">{label}</p>
                  <p className="text-xs text-soft">{description}</p>
                </div>
                <Toggle
                  checked={prefs[key] as boolean}
                  label={label}
                  onChange={(value) => updatePreference(key, value as never)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Appearance & language ---------- */}
        <section className="mb-6">
          <SectionHeader title="Appearance" />
          <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
            <div className="flex items-center gap-3.5 p-4">
              <IconBadge Icon={isDark ? Moon : Sun} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">Dark mode</p>
                <p className="text-xs text-soft">
                  {isDark ? 'Dark theme is on' : 'Light theme is on'}
                </p>
              </div>
              <Toggle checked={isDark} label="Dark mode" onChange={toggleTheme} />
            </div>

            <div className="p-4">
              <div className="mb-3 flex items-center gap-3.5">
                <IconBadge Icon={Globe} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-strong">Language</p>
                  <p className="text-xs text-soft">Interface language preference</p>
                </div>
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {LANGUAGES.map((language) => (
                  <button
                    key={language}
                    onClick={() => {
                      updatePreference('language', language)
                      if (language !== 'English') {
                        showToast(`${language} is planned for a future release.`, 'info')
                      }
                    }}
                    aria-pressed={prefs.language === language}
                    className={`focus-ring shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      prefs.language === language
                        ? 'bg-navy-800 text-white'
                        : 'border border-app text-soft hover:bg-muted'
                    }`}
                  >
                    {language}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-soft">
                Only English is fully translated in this project build.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Support ---------- */}
        <section className="mb-6">
          <SectionHeader title="Help &amp; Support" />
          <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
            <Link
              to="/about"
              className="focus-ring flex items-center gap-3.5 p-4 transition-colors hover:bg-muted"
            >
              <IconBadge Icon={Info} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">About KYRO</p>
                <p className="text-xs text-soft">Project details and limitations</p>
              </div>
              <ChevronRight size={17} className="shrink-0 text-soft" />
            </Link>

            <div className="flex items-start gap-3.5 p-4">
              <IconBadge Icon={HelpCircle} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">Demo credentials</p>
                <p className="mt-1 text-xs leading-relaxed text-soft">
                  Sign in with 9999999999 and OTP 123456. The seeded demo account uses transaction
                  PIN 1234. See the project README for full setup steps.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Button variant="outline" fullWidth icon={<LogOut size={16} />} onClick={logout}>
          Log out
        </Button>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-soft">
          KYRO v1.0.0 · College demonstration project
          <br />
          Payments are simulated. No real money is transferred.
        </p>
      </PageBody>
    </div>
  )
}

/* ---------- Small building blocks ---------- */

function IconBadge({
  Icon,
  tone = 'neutral',
}: {
  Icon: LucideIcon
  tone?: 'neutral' | 'mint'
}) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
        tone === 'mint'
          ? 'bg-mint-100 text-mint-600 dark:bg-mint-500/15 dark:text-mint-300'
          : 'bg-muted text-soft'
      }`}
    >
      <Icon size={18} />
    </span>
  )
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-kyro-500' : 'bg-navy-200 dark:bg-navy-700'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}

function ChangePinForm({ onDone }: { onDone: () => void }) {
  const { showToast } = useUi()
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!/^[0-9]{4}$/.test(currentPin)) {
      setError('Enter your current 4-digit PIN.')
      return
    }
    if (!/^[0-9]{4}$/.test(newPin)) {
      setError('Your new PIN must be exactly 4 digits.')
      return
    }
    if (newPin !== confirmPin) {
      setError('The two new PINs do not match.')
      return
    }
    if (newPin === currentPin) {
      setError('Choose a PIN different from your current one.')
      return
    }

    setIsSubmitting(true)
    try {
      await userService.changePin(currentPin, newPin)
      showToast('Transaction PIN updated')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      onDone()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const pinProps = {
    type: 'password' as const,
    inputMode: 'numeric' as const,
    maxLength: 4,
    className: 'tracking-[0.4em]',
  }

  return (
    <div className="animate-fade-up space-y-4 bg-muted/50 p-4">
      <Field
        label="Current PIN"
        placeholder="••••"
        {...pinProps}
        value={currentPin}
        onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
      />
      <Field
        label="New PIN"
        placeholder="••••"
        {...pinProps}
        value={newPin}
        onChange={(event) => setNewPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
      />
      <Field
        label="Confirm new PIN"
        placeholder="••••"
        {...pinProps}
        value={confirmPin}
        onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
        error={error}
      />
      <div className="flex gap-3">
        <Button variant="outline" fullWidth className="py-2.5 text-xs" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="primary"
          fullWidth
          className="py-2.5 text-xs"
          isLoading={isSubmitting}
          onClick={handleSubmit}
        >
          Update PIN
        </Button>
      </div>
    </div>
  )
}

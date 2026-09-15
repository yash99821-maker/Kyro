import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  ChevronRight,
  Info,
  LogOut,
  Pencil,
  PiggyBank,
  QrCode,
  Receipt,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react'
import { Avatar, Button, Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { userService } from '../services'
import { getErrorMessage } from '../services/api'
import { colorForName, formatCurrency, formatDate, initialsOf } from '../utils/format'

const LINKS = [
  { to: '/save', label: 'Kyro Save', description: 'Round-ups and savings goal', Icon: PiggyBank },
  { to: '/groups', label: 'Kyro Groups', description: 'Shared expenses and settlements', Icon: Users },
  { to: '/insights', label: 'Kyro AI', description: 'Spending insights and charts', Icon: BarChart3 },
  { to: '/transactions', label: 'Transaction History', description: 'All your payments', Icon: Receipt },
  { to: '/my-qr', label: 'My QR Code', description: 'Receive money on KYRO', Icon: QrCode },
  { to: '/notifications', label: 'Notifications', description: 'Alerts and updates', Icon: Bell },
  { to: '/settings', label: 'Settings', description: 'Security, PIN and preferences', Icon: SettingsIcon },
  { to: '/about', label: 'About KYRO', description: 'Project information', Icon: Info },
]

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const { showToast } = useUi()

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!user) return null

  async function handleSave() {
    setError('')
    if (name.trim().length < 2) {
      setError('Your name must be at least 2 characters.')
      return
    }

    setIsSaving(true)
    try {
      const { user: updated } = await userService.updateProfile({
        name: name.trim(),
        email: email.trim(),
      })
      setUser(updated)
      setIsEditing(false)
      showToast('Profile updated')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <header className="kyro-gradient safe-top rounded-b-3xl px-4 pb-8 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="py-3 text-xl font-extrabold tracking-tight">Profile</h1>

          <div className="mt-2 flex items-center gap-4">
            <Avatar
              name={initialsOf(user.name)}
              size={68}
              color={colorForName(user.name)}
              image={user.profileImage || undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{user.name}</p>
              <p className="truncate text-xs text-white/70">{user.upiId}</p>
              <p className="mt-0.5 text-xs text-white/50">+91 {user.mobileNumber}</p>
            </div>
            <button
              onClick={() => setIsEditing((value) => !value)}
              aria-label="Edit profile"
              className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <Pencil size={16} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/10 p-3.5">
              <p className="text-[10px] uppercase tracking-wide text-white/60">Balance</p>
              <p className="mt-0.5 text-lg font-extrabold">{formatCurrency(user.balance)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3.5">
              <p className="text-[10px] uppercase tracking-wide text-white/60">Kyro Save</p>
              <p className="mt-0.5 text-lg font-extrabold">
                {formatCurrency(user.savingsBalance)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        {/* ---------- Edit form ---------- */}
        {isEditing && (
          <section className="kyro-card animate-fade-up mb-5 p-5">
            <h2 className="mb-4 text-sm font-bold text-strong">Edit your details</h2>
            <div className="space-y-4">
              <Field
                label="Full name"
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
              />
              <Field
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={error}
              />
              <div>
                <p className="mb-1.5 text-xs font-semibold text-soft">
                  Mobile number &amp; UPI ID
                </p>
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <p className="text-sm font-medium text-strong">+91 {user.mobileNumber}</p>
                  <p className="text-xs text-soft">{user.upiId}</p>
                </div>
                <p className="mt-1.5 text-xs text-soft">
                  Your mobile number and UPI ID are fixed to your account and cannot be changed.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setIsEditing(false)
                  setName(user.name)
                  setEmail(user.email)
                  setError('')
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" fullWidth isLoading={isSaving} onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </section>
        )}

        {/* ---------- Account info ---------- */}
        <section className="kyro-card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold text-strong">Account information</h2>
          <dl className="space-y-2.5">
            {[
              ['Name', user.name],
              ['Mobile number', `+91 ${user.mobileNumber}`],
              ['Email', user.email || 'Not added'],
              ['KYRO UPI ID', user.upiId],
              ['Member since', formatDate(user.createdAt)],
              ['Kyro Save', user.kyroSave.enabled ? `On · nearest ₹${user.kyroSave.roundUpTo}` : 'Off'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-xs text-soft">{label}</dt>
                <dd className="break-all text-right text-xs font-semibold text-strong">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------- Links ---------- */}
        <section className="kyro-card mb-5 divide-y divide-[color:var(--surface-border)]">
          {LINKS.map(({ to, label, description, Icon }) => (
            <Link
              key={to}
              to={to}
              className="focus-ring flex items-center gap-3.5 p-4 transition-colors hover:bg-muted"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-soft">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">{label}</p>
                <p className="truncate text-xs text-soft">{description}</p>
              </div>
              <ChevronRight size={17} className="shrink-0 text-soft" />
            </Link>
          ))}
        </section>

        <Button variant="outline" fullWidth icon={<LogOut size={16} />} onClick={logout}>
          Log out
        </Button>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-soft">
          KYRO · Smart Digital Payments &amp; Money Management
          <br />
          College demonstration project. Payments are simulated.
        </p>
      </div>
    </div>
  )
}

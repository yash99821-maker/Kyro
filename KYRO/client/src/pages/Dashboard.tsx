import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  ChevronRight,
  CreditCard,
  Droplets,
  Eye,
  EyeOff,
  Flame,
  PiggyBank,
  Plus,
  QrCode,
  Receipt,
  Send,
  Shield,
  Smartphone,
  Tv,
  Users,
  Wifi,
  Zap,
} from 'lucide-react'
import Logo from '../components/Logo'
import TransactionRow from '../components/TransactionRow'
import {
  Avatar,
  EmptyState,
  ErrorState,
  ListSkeleton,
  SectionHeader,
  Skeleton,
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useApiResource } from '../hooks/useApiResource'
import { insightsService, notificationService, savingsService, transactionService } from '../services'
import {
  CATEGORY_COLORS,
  colorForName,
  formatCurrency,
  greetingForHour,
  initialsOf,
} from '../utils/format'

const QUICK_ACTIONS = [
  { to: '/scan', label: 'Scan & Pay', Icon: QrCode, tint: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  { to: '/send', label: 'Send Money', Icon: Send, tint: 'bg-kyro-100 text-kyro-700 dark:bg-kyro-500/15 dark:text-kyro-200' },
  { to: '/request', label: 'Request', Icon: Plus, tint: 'bg-mint-100 text-mint-700 dark:bg-mint-500/15 dark:text-mint-300' },
  { to: '/recharge', label: 'Recharge', Icon: Smartphone, tint: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
  { to: '/bills/electricity', label: 'Electricity', Icon: Zap, tint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { to: '/bills/water', label: 'Water', Icon: Droplets, tint: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  { to: '/bills/dth', label: 'DTH', Icon: Tv, tint: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300' },
  { to: '/bills/fastag', label: 'FASTag', Icon: CreditCard, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { to: '/bills/insurance', label: 'Insurance', Icon: Shield, tint: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
  { to: '/bills/credit-card', label: 'Credit Card', Icon: Receipt, tint: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  { to: '/bills/gas', label: 'Gas', Icon: Flame, tint: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300' },
  { to: '/bills/broadband', label: 'Broadband', Icon: Wifi, tint: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [showAllActions, setShowAllActions] = useState(false)

  const transactions = useApiResource(() => transactionService.list({ limit: 5 }), [])
  const savings = useApiResource(() => savingsService.get(), [])
  const insights = useApiResource(() => insightsService.get(), [])
  const notifications = useApiResource(() => notificationService.list(), [])

  const firstName = user?.name.split(' ')[0] ?? 'there'
  const unreadCount = notifications.data?.unreadCount ?? 0
  const visibleActions = showAllActions ? QUICK_ACTIONS : QUICK_ACTIONS.slice(0, 8)

  const summary = savings.data?.summary
  const topInsight = insights.data?.insights[0]
  const categories = insights.data?.categoriesThisMonth.slice(0, 5) ?? []

  return (
    <div className="min-h-screen">
      {/* ============ Navy header with balance ============ */}
      <header className="kyro-gradient safe-top rounded-b-3xl px-4 pb-8 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between py-3">
            <Logo size={32} light />
            <div className="flex items-center gap-2.5">
              <Link
                to="/notifications"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/profile" aria-label="Your profile" className="focus-ring rounded-2xl">
                <Avatar
                  name={initialsOf(user?.name ?? 'K')}
                  size={40}
                  color={colorForName(user?.name ?? 'KYRO')}
                  image={user?.profileImage || undefined}
                />
              </Link>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xl font-bold">Hi, {firstName} 👋</p>
            <p className="text-xs text-white/60">{greetingForHour()}</p>
          </div>

          {/* Balance card */}
          <div className="mt-5 rounded-2xl bg-white/[0.08] p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                Available Balance
              </span>
              <button
                onClick={() => setBalanceHidden((value) => !value)}
                aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
                className="focus-ring rounded-lg p-1 text-white/60 transition-colors hover:text-white"
              >
                {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <p className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {balanceHidden ? '₹ ••••••' : formatCurrency(user?.balance ?? 0, true)}
            </p>
            <p className="mt-1 text-[11px] text-white/50">{user?.upiId}</p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                onClick={() => navigate('/send')}
                className="focus-ring flex items-center justify-center gap-1.5 rounded-xl bg-kyro-500 py-3 text-xs font-bold shadow-lg shadow-kyro-500/20 transition-all active:scale-95"
              >
                <Send size={14} /> Send
              </button>
              <button
                onClick={() => navigate('/request')}
                className="focus-ring flex items-center justify-center gap-1.5 rounded-xl bg-white/12 py-3 text-xs font-bold transition-all hover:bg-white/20 active:scale-95"
              >
                <Plus size={14} /> Request
              </button>
              <button
                onClick={() => navigate('/scan')}
                className="focus-ring flex items-center justify-center gap-1.5 rounded-xl bg-white/12 py-3 text-xs font-bold transition-all hover:bg-white/20 active:scale-95"
              >
                <QrCode size={14} /> Scan
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        {/* ============ Quick actions ============ */}
        <section className="mb-6">
          <SectionHeader
            title="Quick Actions"
            action={
              <button
                onClick={() => setShowAllActions((value) => !value)}
                className="focus-ring rounded-lg px-1.5 py-1 text-xs font-bold text-kyro-600 dark:text-kyro-300"
              >
                {showAllActions ? 'Show less' : 'View all'}
              </button>
            }
          />
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {visibleActions.map(({ to, label, Icon, tint }) => (
              <Link
                key={to}
                to={to}
                className="focus-ring flex flex-col items-center gap-2 rounded-2xl py-1 transition-transform active:scale-95"
              >
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tint}`}>
                  <Icon size={21} />
                </span>
                <span className="text-center text-[10px] font-semibold leading-tight text-soft">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ============ KYRO SAVE — flagship feature ============ */}
        <section className="mb-6">
          <Link
            to="/save"
            className="kyro-save-gradient focus-ring relative block overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-mint-700/20 transition-transform active:scale-[0.99]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <PiggyBank size={18} />
                  <span className="text-sm font-extrabold tracking-tight">Kyro Save</span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/70">Every payment helps you save.</p>

                {savings.isLoading ? (
                  <Skeleton className="mt-3 h-9 w-32 bg-white/20" />
                ) : (
                  <p className="mt-3 text-3xl font-extrabold tracking-tight">
                    {formatCurrency(summary?.totalSaved ?? 0)}
                  </p>
                )}
                <p className="text-[11px] text-white/70">
                  saved automatically from {summary?.roundUpCount ?? 0} round-ups
                </p>
              </div>

              {/* Savings jar that fills with progress */}
              <div className="relative h-24 w-20 shrink-0">
                <div className="absolute inset-x-2 top-1 h-2.5 rounded-full bg-white/35" />
                <div className="absolute inset-x-0 bottom-0 top-3 overflow-hidden rounded-b-2xl rounded-t-lg border-2 border-white/40 bg-white/10">
                  <div
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-mint-300 to-mint-200/70 transition-all duration-700"
                    style={{ height: `${Math.max(6, Math.min(100, summary?.progressPercent ?? 0))}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-lg">🪙</span>
                </div>
              </div>
            </div>

            {summary && (
              <div className="relative mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                  <span>{summary.goalName}</span>
                  <span className="text-white/80">
                    {formatCurrency(summary.totalSaved)} / {formatCurrency(summary.goalAmount)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${Math.max(1.5, Math.min(100, summary.progressPercent))}%` }}
                  />
                </div>
                <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-white/85">
                  Open Kyro Save <ArrowRight size={12} />
                </p>
              </div>
            )}
          </Link>
        </section>

        {/* ============ Groups + AI feature cards ============ */}
        <section className="mb-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/groups"
            className="kyro-card focus-ring group flex items-center gap-3.5 p-4 transition-all hover:border-kyro-300 active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-white">
              <Users size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-strong">Kyro Groups</p>
              <p className="text-xs text-soft">Split bills. Track dues. Settle easily.</p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-soft" />
          </Link>

          <Link
            to="/insights"
            className="kyro-card focus-ring group flex items-center gap-3.5 p-4 transition-all hover:border-kyro-300 active:scale-[0.99]"
          >
            <span className="kyro-ai-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
              <BarChart3 size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-strong">Kyro AI</p>
              <p className="text-xs text-soft">Understand your spending automatically.</p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-soft" />
          </Link>
        </section>

        {/* ============ Kyro AI alert ============ */}
        {topInsight && (
          <section className="mb-6">
            <Link
              to="/insights"
              className={`focus-ring flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                topInsight.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                  : 'border-kyro-200 bg-kyro-50 dark:border-kyro-500/30 dark:bg-kyro-500/10'
              }`}
            >
              <span className="text-lg leading-none">{topInsight.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-strong">Kyro AI · {topInsight.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-soft">{topInsight.message}</p>
              </div>
              <ChevronRight size={16} className="mt-0.5 shrink-0 text-soft" />
            </Link>
          </section>
        )}

        {/* ============ Spending snapshot ============ */}
        <section className="mb-6">
          <SectionHeader
            title="Spending Snapshot"
            action={
              <Link
                to="/insights"
                className="focus-ring rounded-lg px-1.5 py-1 text-xs font-bold text-kyro-600 dark:text-kyro-300"
              >
                Details
              </Link>
            }
          />
          <div className="kyro-card p-4">
            {insights.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="py-3 text-center text-sm text-soft">
                No spending recorded this month yet.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-soft">
                  This month you have spent{' '}
                  <span className="font-bold text-strong">
                    {formatCurrency(insights.data?.totals.thisMonth ?? 0)}
                  </span>
                </p>
                <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
                  {categories.map((category) => (
                    <div
                      key={category.category}
                      style={{
                        width: `${category.percent}%`,
                        background: CATEGORY_COLORS[category.category],
                      }}
                      title={`${category.label} ${category.percent}%`}
                    />
                  ))}
                </div>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categories.map((category) => (
                    <li key={category.category} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: CATEGORY_COLORS[category.category] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-soft">
                        {category.label}
                      </span>
                      <span className="text-xs font-bold text-strong">
                        {formatCurrency(category.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        {/* ============ Recent transactions ============ */}
        <section>
          <SectionHeader
            title="Recent Transactions"
            action={
              <Link
                to="/transactions"
                className="focus-ring flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs font-bold text-kyro-600 dark:text-kyro-300"
              >
                View all <ChevronRight size={13} />
              </Link>
            }
          />

          {transactions.isLoading ? (
            <ListSkeleton rows={4} />
          ) : transactions.error ? (
            <ErrorState message={transactions.error} onRetry={transactions.reload} />
          ) : (transactions.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Receipt size={26} />}
              title="No transactions yet"
              description="Once you send money or pay a bill, your activity will appear here."
            />
          ) : (
            <div className="kyro-card divide-y divide-[color:var(--surface-border)] p-1">
              {transactions.data!.items.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

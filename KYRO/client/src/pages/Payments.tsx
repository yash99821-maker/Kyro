import { Link } from 'react-router-dom'
import {
  ChevronRight,
  CreditCard,
  Droplets,
  Flame,
  Plus,
  QrCode,
  Receipt,
  Send,
  Shield,
  Smartphone,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react'
import TransactionRow from '../components/TransactionRow'
import { EmptyState, ErrorState, ListSkeleton, SectionHeader } from '../components/ui'
import { useApiResource } from '../hooks/useApiResource'
import { transactionService } from '../services'

const MONEY_ACTIONS = [
  {
    to: '/scan',
    label: 'Scan & Pay',
    description: 'Pay any KYRO QR code',
    Icon: QrCode,
    tint: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  },
  {
    to: '/send',
    label: 'Send Money',
    description: 'Pay a contact or UPI ID',
    Icon: Send,
    tint: 'bg-kyro-100 text-kyro-700 dark:bg-kyro-500/15 dark:text-kyro-200',
  },
  {
    to: '/request',
    label: 'Request Money',
    description: 'Ask someone to pay you',
    Icon: Plus,
    tint: 'bg-mint-100 text-mint-700 dark:bg-mint-500/15 dark:text-mint-300',
  },
  {
    to: '/my-qr',
    label: 'My QR Code',
    description: 'Let others pay you',
    Icon: QrCode,
    tint: 'bg-navy-100 text-navy-700 dark:bg-navy-500/20 dark:text-navy-200',
  },
]

const BILL_CATEGORIES = [
  { to: '/recharge', label: 'Mobile Recharge', Icon: Smartphone, tint: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
  { to: '/bills/electricity', label: 'Electricity', Icon: Zap, tint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { to: '/bills/water', label: 'Water', Icon: Droplets, tint: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  { to: '/bills/dth', label: 'DTH', Icon: Tv, tint: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300' },
  { to: '/bills/gas', label: 'Gas', Icon: Flame, tint: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300' },
  { to: '/bills/broadband', label: 'Broadband', Icon: Wifi, tint: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300' },
  { to: '/bills/fastag', label: 'FASTag', Icon: CreditCard, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { to: '/bills/insurance', label: 'Insurance', Icon: Shield, tint: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
  { to: '/bills/credit-card', label: 'Credit Card', Icon: Receipt, tint: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
]

export default function Payments() {
  const recent = useApiResource(() => transactionService.list({ limit: 6 }), [])

  return (
    <div className="min-h-screen">
      <header className="safe-top border-b border-app bg-card px-4 pb-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-extrabold tracking-tight text-strong">Payments</h1>
          <p className="text-xs text-soft">
            Send, request and pay bills — every payment rounds up into Kyro Save.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        <section className="mb-7">
          <SectionHeader title="Money Transfer" />
          <div className="grid gap-3 sm:grid-cols-2">
            {MONEY_ACTIONS.map(({ to, label, description, Icon, tint }) => (
              <Link
                key={to}
                to={to}
                className="kyro-card focus-ring flex items-center gap-3.5 p-4 transition-all hover:border-kyro-300 active:scale-[0.99]"
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
                  <Icon size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-strong">{label}</p>
                  <p className="truncate text-xs text-soft">{description}</p>
                </div>
                <ChevronRight size={17} className="shrink-0 text-soft" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-7">
          <SectionHeader title="Recharge & Bill Payments" />
          <div className="kyro-card grid grid-cols-3 gap-2 p-4 sm:grid-cols-5">
            {BILL_CATEGORIES.map(({ to, label, Icon, tint }) => (
              <Link
                key={to}
                to={to}
                className="focus-ring flex flex-col items-center gap-2 rounded-2xl p-2 transition-colors hover:bg-muted"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tint}`}>
                  <Icon size={20} />
                </span>
                <span className="text-center text-[10px] font-semibold leading-tight text-soft">
                  {label}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-2.5 text-center text-[11px] text-soft">
            Bill payments are simulated for this college project. They are recorded in the KYRO
            database but no external biller is contacted.
          </p>
        </section>

        <section>
          <SectionHeader
            title="Recent Activity"
            action={
              <Link
                to="/transactions"
                className="focus-ring flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs font-bold text-kyro-600 dark:text-kyro-300"
              >
                View all <ChevronRight size={13} />
              </Link>
            }
          />
          {recent.isLoading ? (
            <ListSkeleton rows={4} />
          ) : recent.error ? (
            <ErrorState message={recent.error} onRetry={recent.reload} />
          ) : (recent.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Receipt size={26} />}
              title="No payments yet"
              description="Your payment activity will show up here once you make your first transaction."
            />
          ) : (
            <div className="kyro-card divide-y divide-[color:var(--surface-border)] p-1">
              {recent.data!.items.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

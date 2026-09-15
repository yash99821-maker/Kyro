import { AlertTriangle, BarChart3, Database, PiggyBank, Server, Users } from 'lucide-react'
import Logo from '../components/Logo'
import { SectionHeader } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'

const UNIQUE_FEATURES = [
  {
    Icon: PiggyBank,
    title: 'Kyro Save',
    description:
      'Every payment is rounded up to the next ₹10 or ₹50 and the difference is moved into a savings pot. The round-up is calculated on the server and each one is stored as its own record, so the savings total is always auditable.',
  },
  {
    Icon: Users,
    title: 'Kyro Groups',
    description:
      'Create a group, add members, log expenses with an equal or custom split, and KYRO derives who owes whom. Balances are never stored — they are recomputed from expenses and settlements, so they can never drift out of sync.',
  },
  {
    Icon: BarChart3,
    title: 'Kyro AI',
    description:
      'A rule-based financial insight engine. It reads your stored transactions, groups them by category and time window, compares this week against last week and this month against last month, and generates plain-language alerts. It is not a machine-learning model.',
  },
]

const STACK = [
  { Icon: Server, label: 'Frontend', value: 'React, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Axios' },
  { Icon: Server, label: 'Backend', value: 'Node.js, Express, TypeScript, JWT authentication, Zod validation' },
  { Icon: Database, label: 'Database', value: 'MongoDB with Mongoose models' },
]

export default function About() {
  return (
    <div className="min-h-screen bg-app">
      <PageHeader title="About KYRO" />

      <PageBody className="max-w-2xl">
        <section className="kyro-gradient rounded-3xl p-6 text-white">
          <Logo size={44} light showTagline />
          <h2 className="mt-5 text-xl font-extrabold tracking-tight">
            Smart Digital Payments &amp; Money Management
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            KYRO combines everyday payments with money management. Alongside sending money,
            scanning QR codes, recharges and bill payments, it automatically saves your spare
            change, splits group expenses, and explains where your money is going.
          </p>
        </section>

        {/* ---------- Important limitation, stated up front ---------- */}
        <section className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-bold text-strong">This is a college demonstration project</p>
            <p className="mt-1 text-xs leading-relaxed text-soft">
              Payment transactions are <strong>simulated</strong> and do not transfer real money.
              KYRO is not connected to any real UPI network, bank, payment gateway or SMS service.
              What is real is the software: authentication, REST APIs, database persistence,
              balance arithmetic, round-up savings, bill-splitting maths and spending analytics.
            </p>
          </div>
        </section>

        {/* ---------- Unique features ---------- */}
        <section className="mt-7">
          <SectionHeader title="What makes KYRO different" />
          <div className="space-y-3">
            {UNIQUE_FEATURES.map(({ Icon, title, description }) => (
              <div key={title} className="kyro-card p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-white">
                    <Icon size={17} />
                  </span>
                  <h3 className="text-sm font-extrabold text-strong">{title}</h3>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-soft">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Tech stack ---------- */}
        <section className="mt-7">
          <SectionHeader title="Technology stack" />
          <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
            {STACK.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3.5 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-soft">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-strong">{label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-soft">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Architecture ---------- */}
        <section className="mt-7">
          <SectionHeader title="How a payment flows through KYRO" />
          <div className="kyro-card p-5">
            <ol className="space-y-3">
              {[
                'You enter an amount and your 4-digit PIN in the browser.',
                'The client POSTs to /api/payments/send — it never calculates a balance itself.',
                'The Express controller validates the request with Zod.',
                'The payment service verifies your PIN against its bcrypt hash.',
                'It checks your balance, then debits it server-side.',
                'It calculates the Kyro Save round-up and moves that amount into savings.',
                'MongoDB stores the transaction, the savings record and the notifications.',
                'The API returns the result, and the success screen renders those exact values.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-xs leading-relaxed text-soft">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <p className="mt-7 text-center text-[11px] leading-relaxed text-soft">
          KYRO v1.0.0 · BCA final-year project
          <br />
          Built with React, Express and MongoDB.
        </p>
      </PageBody>
    </div>
  )
}

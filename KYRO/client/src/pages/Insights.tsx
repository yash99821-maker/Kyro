import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { EmptyState, ErrorState, SectionHeader, Skeleton } from '../components/ui'
import { useApiResource } from '../hooks/useApiResource'
import { insightsService } from '../services'
import { CATEGORY_COLORS, formatCompactCurrency, formatCurrency } from '../utils/format'
import type { InsightTone } from '../types'

const TONE_STYLES: Record<InsightTone, string> = {
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
  positive: 'border-mint-200 bg-mint-50 dark:border-mint-500/30 dark:bg-mint-500/10',
  info: 'border-kyro-200 bg-kyro-50 dark:border-kyro-500/30 dark:bg-kyro-500/10',
  goal: 'border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10',
}

/** Shared tooltip so every chart reads the same way. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name?: string; payload?: { label?: string } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-app bg-card px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-soft">
        {label ?? payload[0]?.payload?.label ?? ''}
      </p>
      <p className="text-sm font-bold text-strong">{formatCurrency(payload[0]!.value)}</p>
    </div>
  )
}

export default function Insights() {
  const report = useApiResource(() => insightsService.get(), [])
  const weekly = useApiResource(() => insightsService.weekly(), [])

  const data = report.data

  // Merge this week and last week into one series for the comparison chart.
  const weeklyComparison = (weekly.data?.current ?? []).map((day, index) => ({
    label: day.label,
    thisWeek: day.total,
    lastWeek: weekly.data?.previous[index]?.total ?? 0,
  }))

  const weekChange = data?.totals.weekChangePercent
  const monthChange = data?.totals.monthChangePercent

  return (
    <div className="min-h-screen bg-app">
      <header className="kyro-ai-gradient safe-top rounded-b-3xl px-4 pb-7 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 py-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
              <BarChart3 size={21} />
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Kyro AI</h1>
              <p className="text-xs text-white/70">Your personal spending intelligence</p>
            </div>
          </div>

          {/* Headline stats */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {[
              {
                label: 'Spent this month',
                value: data ? formatCurrency(data.totals.thisMonth) : null,
                Icon: Wallet,
              },
              {
                label: 'Top category',
                value: data?.topCategory?.label ?? '—',
                Icon: BarChart3,
              },
              {
                label: 'Kyro Save',
                value: data ? formatCurrency(data.savings.totalSaved) : null,
                Icon: PiggyBank,
              },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="rounded-2xl bg-white/10 p-3">
                <Icon size={15} className="mb-1.5 text-white/60" />
                {report.isLoading || value === null ? (
                  <Skeleton className="h-5 w-full bg-white/20" />
                ) : (
                  <p className="truncate text-sm font-extrabold">{value}</p>
                )}
                <p className="mt-0.5 text-[10px] leading-tight text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        {report.error ? (
          <ErrorState message={report.error} onRetry={report.reload} />
        ) : report.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !data?.hasData ? (
          <EmptyState
            icon={<BarChart3 size={26} />}
            title="No insights available yet"
            description="Kyro AI needs a few transactions before it can compare your spending. Make some payments and check back."
          />
        ) : (
          <>
            {/* ---------- Week / month comparison ---------- */}
            <section className="mb-6 grid grid-cols-2 gap-3">
              <ComparisonCard
                title="This week"
                amount={data.totals.thisWeek}
                previousAmount={data.totals.lastWeek}
                changePercent={weekChange}
                previousLabel="last week"
              />
              <ComparisonCard
                title="This month"
                amount={data.totals.thisMonth}
                previousAmount={data.totals.lastMonth}
                changePercent={monthChange}
                previousLabel="last month"
              />
            </section>

            {/* ---------- Smart insights ---------- */}
            <section className="mb-7">
              <SectionHeader title="Smart Insights" />
              <div className="space-y-2.5">
                {data.insights.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-app px-4 py-6 text-center text-sm text-soft">
                    Nothing unusual in your spending right now — everything looks steady.
                  </p>
                ) : (
                  data.insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`flex items-start gap-3 rounded-2xl border p-4 ${TONE_STYLES[insight.tone]}`}
                    >
                      <span className="text-lg leading-none">{insight.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-strong">{insight.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-soft">
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-soft">
                Kyro AI is a rule-based financial insight engine. It analyses your stored
                transactions, compares each category week-on-week and month-on-month, and generates
                these alerts. It is not a machine-learning model.
              </p>
            </section>

            {/* ---------- Category breakdown ---------- */}
            <section className="mb-7">
              <SectionHeader title="Category Breakdown · This month" />
              <div className="kyro-card p-4">
                {data.categoriesThisMonth.length === 0 ? (
                  <p className="py-6 text-center text-sm text-soft">
                    No categorised spending this month yet.
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-5 sm:flex-row">
                    <div className="h-52 w-full sm:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.categoriesThisMonth}
                            dataKey="total"
                            nameKey="label"
                            innerRadius="58%"
                            outerRadius="88%"
                            paddingAngle={2}
                            stroke="none"
                          >
                            {data.categoriesThisMonth.map((entry) => (
                              <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <ul className="w-full space-y-2.5 sm:w-1/2">
                      {data.categoriesThisMonth.map((category) => (
                        <li key={category.category} className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ background: CATEGORY_COLORS[category.category] }}
                          />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-strong">
                            {category.label}
                          </span>
                          <span className="shrink-0 text-xs text-soft">
                            {Math.round(category.percent)}%
                          </span>
                          <span className="w-20 shrink-0 text-right text-xs font-bold text-strong">
                            {formatCurrency(category.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* ---------- Weekly spending ---------- */}
            <section className="mb-7">
              <SectionHeader title="Weekly Spending · This week vs last week" />
              <div className="kyro-card p-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyComparison} barGap={4}>
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        tickFormatter={formatCompactCurrency}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                        content={<ChartTooltip />}
                      />
                      <Bar dataKey="lastWeek" fill="#c5d0ea" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="thisWeek" fill="#06aed4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex justify-center gap-5">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-soft">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#c5d0ea]" /> Last week
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-soft">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#06aed4]" /> This week
                  </span>
                </div>
              </div>
            </section>

            {/* ---------- Monthly spending ---------- */}
            <section className="mb-7">
              <SectionHeader title="Monthly Spending · Last 6 months" />
              <div className="kyro-card p-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlySeries}>
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        tickFormatter={formatCompactCurrency}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#3d569c"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#3d569c' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* ---------- Savings progress ---------- */}
            <section>
              <SectionHeader title="Kyro Save progress" />
              <div className="kyro-save-gradient rounded-3xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/70">{data.savings.goalName}</p>
                    <p className="mt-1 text-2xl font-extrabold">
                      {formatCurrency(data.savings.totalSaved)}
                    </p>
                  </div>
                  <PiggyBank size={34} className="text-white/35" />
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{
                      width: `${Math.max(1.5, Math.min(100, data.savings.progressPercent))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-white/75">
                  {Math.round(data.savings.progressPercent)}% of your{' '}
                  {formatCurrency(data.savings.goalAmount)} goal, saved entirely through automatic
                  round-ups.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function ComparisonCard({
  title,
  amount,
  previousAmount,
  changePercent,
  previousLabel,
}: {
  title: string
  amount: number
  previousAmount: number
  changePercent: number | null | undefined
  previousLabel: string
}) {
  const hasChange = typeof changePercent === 'number' && previousAmount > 0
  const isUp = (changePercent ?? 0) > 0

  return (
    <div className="kyro-card p-4">
      <p className="text-xs font-semibold text-soft">{title}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight text-strong">
        {formatCurrency(amount)}
      </p>
      {hasChange ? (
        <p
          className={`mt-1.5 flex items-center gap-1 text-[11px] font-bold ${
            isUp ? 'text-red-500' : 'text-mint-600 dark:text-mint-400'
          }`}
        >
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(Math.round(changePercent!))}% vs {previousLabel}
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] text-soft">
          {formatCurrency(previousAmount)} {previousLabel}
        </p>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Info, PiggyBank, Target, TrendingUp } from 'lucide-react'
import { Button, EmptyState, ErrorState, Field, ListSkeleton, SectionHeader, Skeleton } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { useApiResource } from '../hooks/useApiResource'
import { savingsService } from '../services'
import { getErrorMessage } from '../services/api'
import { formatCurrency, formatRelativeDay } from '../utils/format'

export default function KyroSave() {
  const { refreshUser } = useAuth()
  const { showToast } = useUi()

  const savings = useApiResource(() => savingsService.get(), [])
  const summary = savings.data?.summary

  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [goalError, setGoalError] = useState('')

  // Seed the goal form from the server response once it arrives.
  useEffect(() => {
    if (!summary) return
    setGoalName(summary.goalName)
    setGoalAmount(String(summary.goalAmount))
  }, [summary?.goalName, summary?.goalAmount]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Every settings change is persisted by the backend, then re-read. */
  async function updateSettings(
    payload: Parameters<typeof savingsService.updateSettings>[0],
    successMessage: string,
  ) {
    setIsSavingSettings(true)
    try {
      const { summary: updated } = await savingsService.updateSettings(payload)
      savings.setData({ summary: updated, recent: savings.data?.recent ?? [] })
      await refreshUser()
      showToast(successMessage)
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    } finally {
      setIsSavingSettings(false)
    }
  }

  async function handleGoalSave() {
    setGoalError('')
    const numericGoal = Number(goalAmount)
    if (goalName.trim().length < 1) {
      setGoalError('Give your goal a name.')
      return
    }
    if (!(numericGoal > 0)) {
      setGoalError('Enter a goal amount greater than zero.')
      return
    }
    await updateSettings(
      { goalName: goalName.trim(), goalAmount: numericGoal },
      'Savings goal updated',
    )
  }

  const progress = Math.max(0, Math.min(100, summary?.progressPercent ?? 0))

  return (
    <div className="min-h-screen bg-app">
      <PageHeader title="Kyro Save" subtitle="Small round-ups. Big goals." />

      <PageBody>
        {savings.error ? (
          <ErrorState message={savings.error} onRetry={savings.reload} />
        ) : (
          <>
            {/* ---------- Savings pot ---------- */}
            <section className="kyro-save-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-mint-700/20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
              />

              <div className="relative flex flex-col items-center">
                {/* The jar, filling with progress */}
                <div className="relative mb-5 h-36 w-28">
                  <div className="absolute inset-x-4 top-0 h-3 rounded-full bg-white/40" />
                  <div className="absolute inset-x-0 bottom-0 top-4 overflow-hidden rounded-b-3xl rounded-t-xl border-[3px] border-white/45 bg-white/10">
                    <div
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-mint-300 via-mint-200 to-mint-100/70 transition-all duration-1000"
                      style={{ height: `${Math.max(8, progress)}%` }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-xl">
                      <span>🪙</span>
                      <span className="text-sm">🪙</span>
                    </div>
                  </div>
                </div>

                {savings.isLoading ? (
                  <Skeleton className="h-10 w-40 bg-white/20" />
                ) : (
                  <p className="text-4xl font-extrabold tracking-tight">
                    {formatCurrency(summary?.totalSaved ?? 0)}
                  </p>
                )}
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">
                  Total Saved
                </p>

                {summary && summary.roundUpCount > 0 && (
                  <p className="mt-2 text-center text-xs text-white/70">
                    Collected from {summary.roundUpCount} automatic round-ups
                  </p>
                )}
              </div>

              {/* Goal progress */}
              {summary && (
                <div className="relative mt-6 rounded-2xl bg-white/[0.12] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <Target size={13} /> {summary.goalName}
                    </span>
                    <span className="text-xs font-semibold text-white/85">
                      {formatCurrency(summary.totalSaved)} / {formatCurrency(summary.goalAmount)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-1000"
                      style={{ width: `${Math.max(1.5, progress)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-white/75">
                    {progress >= 100
                      ? 'Goal reached! 🎉'
                      : `${Math.round(progress)}% there · ${formatCurrency(summary.remainingToGoal)} to go`}
                  </p>
                </div>
              )}
            </section>

            {/* ---------- How it works ---------- */}
            <section className="kyro-card mt-5 flex gap-3 p-4">
              <Info size={17} className="mt-0.5 shrink-0 text-kyro-600 dark:text-kyro-300" />
              <div className="text-xs leading-relaxed text-soft">
                <p className="font-bold text-strong">How Kyro Save works</p>
                <p className="mt-1">
                  Every time you pay, KYRO rounds the amount up to the next{' '}
                  {formatCurrency(summary?.roundUpTo ?? 10)} and moves the difference into your
                  savings pot. Pay {formatCurrency(87)} and {formatCurrency(3)} is saved; pay{' '}
                  {formatCurrency(126)} and {formatCurrency(4)} is saved. The calculation runs on
                  the KYRO server and every round-up is stored in the database.
                </p>
              </div>
            </section>

            {/* ---------- Settings ---------- */}
            <section className="mt-6">
              <SectionHeader title="Round-up settings" />
              <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
                <div className="flex items-center justify-between p-4">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-bold text-strong">Kyro Save</p>
                    <p className="text-xs text-soft">
                      {summary?.enabled
                        ? 'Turned on — payments round up automatically.'
                        : 'Turned off — payments will not round up.'}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={summary?.enabled ?? false}
                    aria-label="Toggle Kyro Save"
                    disabled={isSavingSettings || savings.isLoading}
                    onClick={() =>
                      updateSettings(
                        { enabled: !summary?.enabled },
                        summary?.enabled ? 'Kyro Save turned off' : 'Kyro Save turned on',
                      )
                    }
                    className={`focus-ring relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                      summary?.enabled ? 'bg-mint-500' : 'bg-navy-200 dark:bg-navy-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        summary?.enabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4">
                  <p className="text-sm font-bold text-strong">Round up to the nearest</p>
                  <p className="mb-3 text-xs text-soft">
                    A bigger round-up saves faster on every payment.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([10, 50] as const).map((option) => (
                      <button
                        key={option}
                        disabled={isSavingSettings}
                        onClick={() =>
                          updateSettings(
                            { roundUpTo: option },
                            `Rounding up to the nearest ₹${option}`,
                          )
                        }
                        aria-pressed={summary?.roundUpTo === option}
                        className={`focus-ring rounded-2xl border-2 p-4 text-left transition-all disabled:opacity-50 ${
                          summary?.roundUpTo === option
                            ? 'border-mint-500 bg-mint-50 dark:bg-mint-500/10'
                            : 'border-app hover:bg-muted'
                        }`}
                      >
                        <p className="text-lg font-extrabold text-strong">₹{option}</p>
                        <p className="mt-0.5 text-[11px] leading-tight text-soft">
                          {option === 10
                            ? '₹126 → ₹130, saves ₹4'
                            : '₹126 → ₹150, saves ₹24'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <p className="mb-3 text-sm font-bold text-strong">Savings goal</p>
                  <div className="space-y-3">
                    <Field
                      label="Goal name"
                      placeholder="e.g. Laptop Goal"
                      maxLength={40}
                      value={goalName}
                      onChange={(event) => setGoalName(event.target.value)}
                    />
                    <Field
                      label="Target amount"
                      type="text"
                      inputMode="numeric"
                      prefix="₹"
                      placeholder="60000"
                      value={goalAmount}
                      onChange={(event) =>
                        setGoalAmount(event.target.value.replace(/[^0-9]/g, '').slice(0, 8))
                      }
                      error={goalError}
                    />
                  </div>
                  <Button
                    variant="outline"
                    fullWidth
                    className="mt-3"
                    isLoading={isSavingSettings}
                    onClick={handleGoalSave}
                  >
                    Update goal
                  </Button>
                </div>
              </div>
            </section>

            {/* ---------- Recent round-ups ---------- */}
            <section className="mt-6">
              <SectionHeader title="Recent savings" />
              {savings.isLoading ? (
                <ListSkeleton rows={4} />
              ) : (savings.data?.recent.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<PiggyBank size={26} />}
                  title="No savings yet"
                  description="Make a payment with Kyro Save turned on and your first round-up will land here."
                />
              ) : (
                <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
                  {savings.data!.recent.map((saving) => (
                    <div key={saving.id} className="flex items-center gap-3 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint-100 text-mint-600 dark:bg-mint-500/15 dark:text-mint-300">
                        <TrendingUp size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-strong">
                          {saving.label || 'Payment round-up'}
                        </p>
                        <p className="truncate text-xs text-soft">
                          {formatCurrency(saving.originalAmount)} rounded to{' '}
                          {formatCurrency(saving.roundedAmount)} ·{' '}
                          {formatRelativeDay(saving.createdAt)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-mint-600 dark:text-mint-400">
                        +{formatCurrency(saving.savedAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </PageBody>
    </div>
  )
}

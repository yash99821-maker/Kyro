import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Plus, Receipt, Trash2, UserPlus, X } from 'lucide-react'
import { Avatar, Badge, Button, EmptyState, ErrorState, Field, ListSkeleton } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { useApiResource } from '../hooks/useApiResource'
import { groupService } from '../services'
import { getErrorMessage } from '../services/api'
import { colorForName, formatCurrency, formatRelativeDay, initialsOf } from '../utils/format'
import type { DebtEdge, GroupMember, SplitType } from '../types'

type Tab = 'expenses' | 'balances' | 'members'

export default function GroupDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useUi()

  const group = useApiResource(() => groupService.get(id), [id])
  const [tab, setTab] = useState<Tab>('expenses')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [settling, setSettling] = useState<DebtEdge | null>(null)

  const members = group.data?.group.members ?? []
  const balances = group.data?.balances

  /** memberId -> display name, so expenses can be labelled without lookups. */
  const memberNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of members) map.set(member._id, member.name)
    return map
  }, [members])

  const yourMemberId = balances?.yourMemberId

  function displayName(memberId: string): string {
    const name = memberNames.get(memberId) ?? 'Unknown'
    return memberId === yourMemberId ? 'You' : name
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      await groupService.deleteExpense(id, expenseId)
      showToast('Expense removed')
      await group.reload()
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    }
  }

  async function handleDeleteGroup() {
    try {
      await groupService.remove(id)
      showToast('Group deleted')
      navigate('/groups', { replace: true })
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    }
  }

  const isOwner = group.data && user && group.data.group.createdBy === user.id

  return (
    <div className="min-h-screen bg-app">
      <PageHeader
        title={group.data?.group.name ?? 'Group'}
        subtitle={
          group.data ? `${members.length} members · ${formatCurrency(balances?.totalExpenses ?? 0)} total` : undefined
        }
        onBack={() => navigate('/groups')}
        action={
          isOwner ? (
            <button
              onClick={handleDeleteGroup}
              aria-label="Delete group"
              className="focus-ring rounded-full p-2 text-soft transition-colors hover:bg-muted hover:text-red-500"
            >
              <Trash2 size={17} />
            </button>
          ) : undefined
        }
      />

      <PageBody>
        {group.isLoading ? (
          <ListSkeleton rows={4} />
        ) : group.error ? (
          <ErrorState message={group.error} onRetry={group.reload} />
        ) : !group.data ? null : (
          <>
            {/* ---------- Your position ---------- */}
            <section
              className={`rounded-3xl p-5 text-white shadow-lg ${
                (balances?.yourNet ?? 0) < -0.01
                  ? 'bg-gradient-to-br from-red-500 to-rose-600'
                  : (balances?.yourNet ?? 0) > 0.01
                    ? 'kyro-save-gradient'
                    : 'kyro-gradient'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Your position in this group
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight">
                {(balances?.yourNet ?? 0) < -0.01
                  ? `You owe ${formatCurrency(Math.abs(balances!.yourNet))}`
                  : (balances?.yourNet ?? 0) > 0.01
                    ? `You get ${formatCurrency(balances!.yourNet)}`
                    : 'All settled up'}
              </p>
              <p className="mt-1 text-xs text-white/70">
                Calculated from {group.data.expenses.length}{' '}
                {group.data.expenses.length === 1 ? 'expense' : 'expenses'} and{' '}
                {group.data.settlements.length}{' '}
                {group.data.settlements.length === 1 ? 'settlement' : 'settlements'}.
              </p>
            </section>

            {/* ---------- Tabs ---------- */}
            <div className="mt-5 flex gap-1 rounded-2xl bg-muted p-1">
              {(['expenses', 'balances', 'members'] as Tab[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setTab(option)}
                  aria-pressed={tab === option}
                  className={`focus-ring flex-1 rounded-xl py-2.5 text-xs font-bold capitalize transition-colors ${
                    tab === option ? 'bg-card text-strong shadow-sm' : 'text-soft'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* ---------- Expenses ---------- */}
            {tab === 'expenses' && (
              <section className="mt-5">
                <Button
                  variant="primary"
                  fullWidth
                  icon={<Plus size={16} />}
                  onClick={() => setShowExpenseForm(true)}
                >
                  Add expense
                </Button>

                {group.data.expenses.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      icon={<Receipt size={26} />}
                      title="No expenses yet"
                      description="Add the first expense and KYRO will work out who owes whom."
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {group.data.expenses.map((expense) => (
                      <div key={expense.id} className="kyro-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-strong">
                              {expense.description}
                            </p>
                            <p className="text-xs text-soft">
                              Paid by {displayName(expense.paidBy)} ·{' '}
                              {formatRelativeDay(expense.createdAt)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-extrabold text-strong">
                              {formatCurrency(expense.amount)}
                            </p>
                            <Badge tone={expense.splitType === 'EQUAL' ? 'neutral' : 'accent'}>
                              {expense.splitType === 'EQUAL' ? 'Equal' : 'Custom'}
                            </Badge>
                          </div>
                        </div>

                        <ul className="mt-3 space-y-1 border-t border-app pt-3">
                          {expense.participants.map((participant) => (
                            <li
                              key={participant.memberId}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-soft">
                                {displayName(participant.memberId)}
                              </span>
                              <span className="font-semibold text-strong">
                                {formatCurrency(participant.share)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="focus-ring mt-2 flex items-center gap-1 rounded-lg px-1 py-1 text-[11px] font-semibold text-soft transition-colors hover:text-red-500"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ---------- Balances ---------- */}
            {tab === 'balances' && balances && (
              <section className="mt-5 space-y-5">
                <div>
                  <p className="mb-3 text-xs font-bold text-soft">WHO OWES WHOM</p>
                  {balances.debts.length === 0 ? (
                    <div className="kyro-card p-6 text-center">
                      <p className="text-2xl">🎉</p>
                      <p className="mt-2 text-sm font-bold text-strong">Everyone is settled up</p>
                      <p className="mt-1 text-xs text-soft">
                        No outstanding balances in this group.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {balances.debts.map((debt, index) => (
                        <div
                          key={`${debt.fromMemberId}-${debt.toMemberId}-${index}`}
                          className="kyro-card flex items-center gap-3 p-4"
                        >
                          <Avatar
                            name={initialsOf(debt.fromName)}
                            size={38}
                            color={colorForName(debt.fromName)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-strong">
                              {debt.fromMemberId === yourMemberId ? 'You owe' : `${debt.fromName} owes`}{' '}
                              {debt.toMemberId === yourMemberId ? 'you' : debt.toName}
                            </p>
                            <p className="text-xs text-soft">Outstanding</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-extrabold text-strong">
                              {formatCurrency(debt.amount)}
                            </p>
                            <button
                              onClick={() => setSettling(debt)}
                              className="focus-ring mt-0.5 flex items-center gap-0.5 rounded-lg text-[11px] font-bold text-kyro-600 dark:text-kyro-300"
                            >
                              Settle Up <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold text-soft">MEMBER BALANCES</p>
                  <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
                    {balances.memberBalances.map((member) => (
                      <div key={member.memberId} className="flex items-center gap-3 p-4">
                        <Avatar
                          name={initialsOf(member.name)}
                          size={38}
                          color={colorForName(member.name)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-strong">
                            {member.memberId === yourMemberId ? 'You' : member.name}
                          </p>
                          <p className="text-xs text-soft">
                            Paid {formatCurrency(member.paid)} · Share {formatCurrency(member.share)}
                          </p>
                        </div>
                        <p
                          className={`shrink-0 text-sm font-bold ${
                            member.net > 0.01
                              ? 'text-mint-600 dark:text-mint-400'
                              : member.net < -0.01
                                ? 'text-red-500'
                                : 'text-soft'
                          }`}
                        >
                          {member.net > 0.01
                            ? `+${formatCurrency(member.net)}`
                            : member.net < -0.01
                              ? `−${formatCurrency(Math.abs(member.net))}`
                              : '₹0'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {group.data.settlements.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-bold text-soft">SETTLEMENT HISTORY</p>
                    <div className="kyro-card divide-y divide-[color:var(--surface-border)]">
                      {group.data.settlements.map((settlement) => (
                        <div key={settlement.id} className="flex items-center gap-3 p-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint-100 text-mint-600 dark:bg-mint-500/15 dark:text-mint-300">
                            ✓
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-strong">
                              {displayName(settlement.fromMemberId)} paid{' '}
                              {displayName(settlement.toMemberId)}
                            </p>
                            <p className="truncate text-[11px] text-soft">
                              {settlement.note || 'Settled'} ·{' '}
                              {formatRelativeDay(settlement.createdAt)}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-strong">
                            {formatCurrency(settlement.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ---------- Members ---------- */}
            {tab === 'members' && (
              <section className="mt-5">
                <Button
                  variant="outline"
                  fullWidth
                  icon={<UserPlus size={16} />}
                  onClick={() => setShowMemberForm(true)}
                >
                  Add member
                </Button>
                <div className="kyro-card mt-4 divide-y divide-[color:var(--surface-border)]">
                  {members.map((member) => (
                    <div key={member._id} className="flex items-center gap-3 p-4">
                      <Avatar
                        name={initialsOf(member.name)}
                        color={colorForName(member.name)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-strong">
                          {member._id === yourMemberId ? `${member.name} (You)` : member.name}
                        </p>
                        <p className="truncate text-xs text-soft">
                          {member.mobileNumber || 'Not on KYRO'}
                        </p>
                      </div>
                      {member.userId && <Badge tone="accent">KYRO</Badge>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </PageBody>

      {showExpenseForm && group.data && (
        <ExpenseForm
          groupId={id}
          members={members}
          yourMemberId={yourMemberId}
          onClose={() => setShowExpenseForm(false)}
          onSaved={async () => {
            setShowExpenseForm(false)
            await group.reload()
          }}
        />
      )}

      {showMemberForm && (
        <MemberForm
          groupId={id}
          onClose={() => setShowMemberForm(false)}
          onSaved={async () => {
            setShowMemberForm(false)
            await group.reload()
          }}
        />
      )}

      {settling && (
        <SettleForm
          groupId={id}
          debt={settling}
          onClose={() => setSettling(null)}
          onSaved={async () => {
            setSettling(null)
            await group.reload()
          }}
        />
      )}
    </div>
  )
}

/* ==================== Add expense ==================== */

function ExpenseForm({
  groupId,
  members,
  yourMemberId,
  onClose,
  onSaved,
}: {
  groupId: string
  members: GroupMember[]
  yourMemberId: string | null | undefined
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showToast } = useUi()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(yourMemberId ?? members[0]?._id ?? '')
  const [splitType, setSplitType] = useState<SplitType>('EQUAL')
  const [included, setIncluded] = useState<string[]>(members.map((member) => member._id))
  const [customShares, setCustomShares] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const total = Number(amount) || 0
  const equalShare = included.length > 0 ? total / included.length : 0

  const customTotal = included.reduce(
    (sum, memberId) => sum + (Number(customShares[memberId]) || 0),
    0,
  )
  const customDifference = Math.round((total - customTotal) * 100) / 100

  function toggleMember(memberId: string) {
    setIncluded((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    )
  }

  async function handleSubmit() {
    setError('')
    if (description.trim().length < 1) {
      setError('Describe what this expense was for.')
      return
    }
    if (!(total > 0)) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (included.length === 0) {
      setError('Select at least one person to split with.')
      return
    }
    if (splitType === 'CUSTOM' && Math.abs(customDifference) > 0.01) {
      setError(
        `Split amounts add up to ${formatCurrency(customTotal)} but the expense is ${formatCurrency(total)}.`,
      )
      return
    }

    setIsSubmitting(true)
    try {
      await groupService.addExpense(groupId, {
        description: description.trim(),
        amount: total,
        paidBy,
        splitType,
        participants: included.map((memberId) => ({
          memberId,
          ...(splitType === 'CUSTOM' ? { share: Number(customShares[memberId]) || 0 } : {}),
        })),
      })
      showToast('Expense added')
      await onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet title="Add expense" onClose={onClose}>
      <Field
        label="Description"
        placeholder="e.g. Hotel booking"
        autoFocus
        maxLength={80}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <div className="mt-4">
        <Field
          label="Amount"
          type="text"
          inputMode="decimal"
          prefix="₹"
          placeholder="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 9))}
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-soft">Paid by</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {members.map((member) => (
            <button
              key={member._id}
              onClick={() => setPaidBy(member._id)}
              aria-pressed={paidBy === member._id}
              className={`focus-ring shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                paidBy === member._id
                  ? 'bg-navy-800 text-white'
                  : 'border border-app text-soft hover:bg-muted'
              }`}
            >
              {member._id === yourMemberId ? 'You' : member.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-soft">Split type</p>
        <div className="grid grid-cols-2 gap-2">
          {(['EQUAL', 'CUSTOM'] as SplitType[]).map((option) => (
            <button
              key={option}
              onClick={() => setSplitType(option)}
              aria-pressed={splitType === option}
              className={`focus-ring rounded-2xl border-2 p-3 text-left transition-all ${
                splitType === option
                  ? 'border-kyro-400 bg-kyro-50 dark:bg-kyro-500/10'
                  : 'border-app hover:bg-muted'
              }`}
            >
              <p className="text-sm font-bold text-strong">
                {option === 'EQUAL' ? 'Equal split' : 'Custom split'}
              </p>
              <p className="text-[11px] text-soft">
                {option === 'EQUAL' ? 'Divide evenly' : 'Set each amount'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-soft">
          Split between ({included.length} selected)
        </p>
        <div className="space-y-2">
          {members.map((member) => {
            const isIncluded = included.includes(member._id)
            return (
              <div
                key={member._id}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                  isIncluded ? 'border-app bg-card' : 'border-dashed border-app opacity-55'
                }`}
              >
                <input
                  type="checkbox"
                  id={`split-${member._id}`}
                  checked={isIncluded}
                  onChange={() => toggleMember(member._id)}
                  className="h-4 w-4 shrink-0 accent-[#06aed4]"
                />
                <label
                  htmlFor={`split-${member._id}`}
                  className="min-w-0 flex-1 cursor-pointer truncate text-sm font-medium text-strong"
                >
                  {member._id === yourMemberId ? 'You' : member.name}
                </label>

                {isIncluded &&
                  (splitType === 'EQUAL' ? (
                    <span className="shrink-0 text-sm font-bold text-strong">
                      {formatCurrency(equalShare)}
                    </span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-sm text-soft">₹</span>
                      <input
                        inputMode="decimal"
                        placeholder="0"
                        value={customShares[member._id] ?? ''}
                        onChange={(event) =>
                          setCustomShares({
                            ...customShares,
                            [member._id]: event.target.value.replace(/[^0-9.]/g, '').slice(0, 8),
                          })
                        }
                        className="w-20 rounded-lg border border-app bg-card px-2 py-1.5 text-right text-sm font-semibold text-strong outline-none focus:border-kyro-400"
                      />
                    </div>
                  ))}
              </div>
            )
          })}
        </div>

        {splitType === 'CUSTOM' && total > 0 && (
          <div
            className={`mt-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${
              Math.abs(customDifference) <= 0.01
                ? 'bg-mint-50 text-mint-700 dark:bg-mint-500/10 dark:text-mint-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
            }`}
          >
            {Math.abs(customDifference) <= 0.01
              ? `Balanced — ${formatCurrency(customTotal)} of ${formatCurrency(total)} allocated ✓`
              : customDifference > 0
                ? `${formatCurrency(customDifference)} still to allocate`
                : `${formatCurrency(Math.abs(customDifference))} over the expense amount`}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-500">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button variant="outline" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" fullWidth isLoading={isSubmitting} onClick={handleSubmit}>
          Add expense
        </Button>
      </div>
    </Sheet>
  )
}

/* ==================== Add member ==================== */

function MemberForm({
  groupId,
  onClose,
  onSaved,
}: {
  groupId: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showToast } = useUi()
  const [name, setName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setError('')
    if (name.trim().length < 1) {
      setError('Enter the person’s name.')
      return
    }
    if (mobileNumber && !/^[0-9]{10}$/.test(mobileNumber)) {
      setError('Mobile number must be 10 digits, or left blank.')
      return
    }

    setIsSubmitting(true)
    try {
      await groupService.addMember(groupId, { name: name.trim(), mobileNumber })
      showToast(`${name.trim()} added to the group`)
      await onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet title="Add member" onClose={onClose}>
      <Field
        label="Name"
        placeholder="e.g. Aman Verma"
        autoFocus
        maxLength={50}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="mt-4">
        <Field
          label="Mobile number (optional)"
          inputMode="numeric"
          prefix={<span className="font-semibold text-strong">+91</span>}
          placeholder="9876543210"
          value={mobileNumber}
          onChange={(event) => setMobileNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
          hint="Adding a number links this person to their KYRO account."
          error={error}
        />
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" fullWidth isLoading={isSubmitting} onClick={handleSubmit}>
          Add member
        </Button>
      </div>
    </Sheet>
  )
}

/* ==================== Settle up ==================== */

function SettleForm({
  groupId,
  debt,
  onClose,
  onSaved,
}: {
  groupId: string
  debt: DebtEdge
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showToast } = useUi()
  const [amount, setAmount] = useState(String(debt.amount))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setError('')
    const numeric = Number(amount)
    if (!(numeric > 0)) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (numeric > debt.amount + 0.01) {
      setError(`That is more than the ${formatCurrency(debt.amount)} outstanding.`)
      return
    }

    setIsSubmitting(true)
    try {
      await groupService.settle(groupId, {
        fromMemberId: debt.fromMemberId,
        toMemberId: debt.toMemberId,
        amount: numeric,
        note: note.trim(),
      })
      showToast('Settlement recorded')
      await onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet title="Settle up" onClose={onClose}>
      <div className="mb-5 flex items-center justify-center gap-3 rounded-2xl bg-muted p-4">
        <Avatar name={initialsOf(debt.fromName)} size={40} color={colorForName(debt.fromName)} />
        <ArrowRight size={17} className="text-soft" />
        <Avatar name={initialsOf(debt.toName)} size={40} color={colorForName(debt.toName)} />
      </div>
      <p className="mb-5 text-center text-sm text-soft">
        <span className="font-bold text-strong">{debt.fromName}</span> pays{' '}
        <span className="font-bold text-strong">{debt.toName}</span>
        <br />
        Outstanding: <span className="font-bold text-strong">{formatCurrency(debt.amount)}</span>
      </p>

      <Field
        label="Settlement amount"
        type="text"
        inputMode="decimal"
        prefix="₹"
        value={amount}
        onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 9))}
        error={error}
      />
      <div className="mt-4">
        <Field
          label="Note (optional)"
          placeholder="e.g. Paid in cash"
          maxLength={140}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-soft">
        This records the repayment inside the group so balances update. It does not move money
        between KYRO accounts.
      </p>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button variant="save" fullWidth isLoading={isSubmitting} onClick={handleSubmit}>
          Record settlement
        </Button>
      </div>
    </Sheet>
  )
}

/* ==================== Shared bottom sheet ==================== */

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[150] flex items-end justify-center bg-navy-950/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-sheet max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-strong">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="focus-ring rounded-full p-1.5 text-soft transition-colors hover:bg-muted"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

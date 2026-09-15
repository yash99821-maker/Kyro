import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, X } from 'lucide-react'
import { Button, EmptyState, ErrorState, Field, ListSkeleton } from '../components/ui'
import { useUi } from '../context/UiContext'
import { useApiResource } from '../hooks/useApiResource'
import { groupService } from '../services'
import { getErrorMessage } from '../services/api'
import { formatCurrency } from '../utils/format'

const EMOJI_CHOICES = ['👥', '🏖️', '🎓', '🏠', '🍽️', '✈️', '🎉', '🚗']

interface DraftMember {
  name: string
  mobileNumber: string
}

export default function Groups() {
  const { showToast } = useUi()
  const groups = useApiResource(() => groupService.list(), [])

  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👥')
  const [members, setMembers] = useState<DraftMember[]>([{ name: '', mobileNumber: '' }])
  const [error, setError] = useState('')

  function resetForm() {
    setName('')
    setEmoji('👥')
    setMembers([{ name: '', mobileNumber: '' }])
    setError('')
  }

  async function handleCreate() {
    setError('')
    if (name.trim().length < 2) {
      setError('Give your group a name with at least 2 characters.')
      return
    }

    const cleanMembers = members
      .map((member) => ({
        name: member.name.trim(),
        mobileNumber: member.mobileNumber.trim(),
      }))
      .filter((member) => member.name.length > 0)

    if (cleanMembers.some((member) => member.mobileNumber && !/^[0-9]{10}$/.test(member.mobileNumber))) {
      setError('Mobile numbers must be 10 digits, or left blank.')
      return
    }

    setIsSubmitting(true)
    try {
      await groupService.create({ name: name.trim(), emoji, members: cleanMembers })
      showToast(`"${name.trim()}" created`)
      setIsCreating(false)
      resetForm()
      await groups.reload()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <header className="safe-top border-b border-app bg-card px-4 pb-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-strong">Kyro Groups</h1>
            <p className="text-xs text-soft">Split bills. Track dues. Settle easily.</p>
          </div>
          <Button
            variant="primary"
            className="shrink-0 px-4 py-2.5 text-xs"
            icon={<Plus size={15} />}
            onClick={() => setIsCreating(true)}
          >
            New Group
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        {groups.isLoading ? (
          <ListSkeleton rows={3} />
        ) : groups.error ? (
          <ErrorState message={groups.error} onRetry={groups.reload} />
        ) : (groups.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Users size={26} />}
            title="No groups yet"
            description="Create a group for a trip, flatmates or a project team and KYRO will keep track of who owes whom."
            action={
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setIsCreating(true)}>
                Create your first group
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.data!.map((group) => {
              const owes = group.yourNet < -0.01
              const owed = group.yourNet > 0.01
              return (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="kyro-card focus-ring p-4 transition-all hover:border-kyro-300 active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl">
                      {group.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-strong">{group.name}</p>
                      <p className="text-xs text-soft">
                        {group.memberCount} members · {formatCurrency(group.totalExpenses)} total
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-app pt-3">
                    {owes ? (
                      <p className="text-sm font-bold text-red-500">
                        You owe {formatCurrency(Math.abs(group.yourNet))}
                      </p>
                    ) : owed ? (
                      <p className="text-sm font-bold text-mint-600 dark:text-mint-400">
                        You get back {formatCurrency(group.yourNet)}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-soft">All settled up ✓</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ---------- Create group sheet ---------- */}
      {isCreating && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create a group"
          className="fixed inset-0 z-[150] flex items-end justify-center bg-navy-950/70 backdrop-blur-sm sm:items-center"
          onClick={() => !isSubmitting && setIsCreating(false)}
        >
          <div
            className="animate-sheet max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-strong">New group</h2>
              <button
                onClick={() => setIsCreating(false)}
                aria-label="Close"
                className="focus-ring rounded-full p-1.5 text-soft transition-colors hover:bg-muted"
              >
                <X size={17} />
              </button>
            </div>

            <Field
              label="Group name"
              placeholder="e.g. Goa Trip"
              autoFocus
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-soft">Icon</p>
              <div className="flex flex-wrap gap-2">
                {EMOJI_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => setEmoji(choice)}
                    aria-pressed={emoji === choice}
                    className={`focus-ring flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition-all ${
                      emoji === choice ? 'bg-navy-800 ring-2 ring-kyro-400' : 'bg-muted'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-1 text-xs font-semibold text-soft">Members</p>
              <p className="mb-3 text-[11px] text-soft">
                You are added automatically. Add a mobile number to link an existing KYRO account.
              </p>

              <div className="space-y-2.5">
                {members.map((member, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      placeholder="Name"
                      maxLength={50}
                      value={member.name}
                      onChange={(event) => {
                        const next = [...members]
                        next[index] = { ...next[index]!, name: event.target.value }
                        setMembers(next)
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-strong outline-none focus:border-kyro-400"
                    />
                    <input
                      placeholder="Mobile (optional)"
                      inputMode="numeric"
                      value={member.mobileNumber}
                      onChange={(event) => {
                        const next = [...members]
                        next[index] = {
                          ...next[index]!,
                          mobileNumber: event.target.value.replace(/\D/g, '').slice(0, 10),
                        }
                        setMembers(next)
                      }}
                      className="w-32 shrink-0 rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-strong outline-none focus:border-kyro-400"
                    />
                    {members.length > 1 && (
                      <button
                        onClick={() => setMembers(members.filter((_, i) => i !== index))}
                        aria-label={`Remove member ${index + 1}`}
                        className="focus-ring shrink-0 rounded-xl px-2 text-soft transition-colors hover:bg-muted"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setMembers([...members, { name: '', mobileNumber: '' }])}
                className="focus-ring mt-3 flex items-center gap-1.5 rounded-xl px-1 py-1 text-xs font-bold text-kyro-600 dark:text-kyro-300"
              >
                <Plus size={14} /> Add another member
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm font-medium text-red-500">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth isLoading={isSubmitting} onClick={handleCreate}>
                Create group
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

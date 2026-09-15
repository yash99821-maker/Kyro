import { useState } from 'react'
import { Check, Clock, HandCoins, Search, X } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  ListSkeleton,
  SectionHeader,
} from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useUi } from '../context/UiContext'
import { useApiResource } from '../hooks/useApiResource'
import { requestService, userService } from '../services'
import { getErrorMessage } from '../services/api'
import { colorForName, formatCurrency, formatRelativeDay, initialsOf } from '../utils/format'
import type { DirectoryUser, MoneyRequest, RequestStatus } from '../types'

const STATUS_TONE: Record<RequestStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
}

export default function RequestMoney() {
  const { showToast } = useUi()

  const [selected, setSelected] = useState<DirectoryUser | null>(null)
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const directory = useApiResource(() => userService.directory(), [])
  const requests = useApiResource(() => requestService.list(), [])

  const people = (directory.data ?? []).filter((person) =>
    search.trim()
      ? person.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        person.upiId.toLowerCase().includes(search.trim().toLowerCase())
      : true,
  )

  async function handleSubmit() {
    setError('')
    if (!selected) {
      setError('Choose who you want to request money from.')
      return
    }
    const numeric = Number(amount)
    if (!(numeric > 0)) {
      setError('Enter a valid amount.')
      return
    }

    setIsSubmitting(true)
    try {
      await requestService.create({
        payeeName: selected.name,
        payeeUpiId: selected.upiId,
        amount: numeric,
        note: note.trim(),
      })
      showToast(`Requested ${formatCurrency(numeric)} from ${selected.name}`)
      setSelected(null)
      setAmount('')
      setNote('')
      await requests.reload()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function respond(request: MoneyRequest, status: 'ACCEPTED' | 'REJECTED') {
    try {
      await requestService.updateStatus(request.id, status)
      showToast(status === 'ACCEPTED' ? 'Request accepted' : 'Request declined')
      await requests.reload()
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  async function cancel(request: MoneyRequest) {
    try {
      await requestService.cancel(request.id)
      showToast('Request cancelled')
      await requests.reload()
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <PageHeader title="Request Money" subtitle="Ask someone on KYRO to pay you" />

      <PageBody>
        {/* ---------- New request ---------- */}
        <section className="kyro-card p-4">
          <SectionHeader title="New request" />

          {selected ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-muted p-3">
              <Avatar name={initialsOf(selected.name)} color={colorForName(selected.name)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-strong">{selected.name}</p>
                <p className="truncate text-xs text-soft">{selected.upiId}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Choose someone else"
                className="focus-ring rounded-full p-1.5 text-soft transition-colors hover:bg-card"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <Field
                label="Request from"
                placeholder="Search KYRO contacts"
                prefix={<Search size={15} />}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="mt-3 max-h-60 overflow-y-auto">
                {directory.isLoading ? (
                  <ListSkeleton rows={3} />
                ) : directory.error ? (
                  <ErrorState message={directory.error} onRetry={directory.reload} />
                ) : (
                  <div className="divide-y divide-[color:var(--surface-border)]">
                    {people.slice(0, 8).map((person) => (
                      <button
                        key={person.id}
                        onClick={() => setSelected(person)}
                        className="focus-ring flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted"
                      >
                        <Avatar
                          name={initialsOf(person.name)}
                          size={38}
                          color={colorForName(person.name)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-strong">{person.name}</p>
                          <p className="truncate text-xs text-soft">{person.upiId}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-4 space-y-4">
            <Field
              label="Amount"
              type="text"
              inputMode="decimal"
              prefix="₹"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 8))}
              error={error}
            />
            <Field
              label="Note (optional)"
              placeholder="What is this for?"
              maxLength={140}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <Button
            variant="accent"
            fullWidth
            className="mt-5"
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Send request
          </Button>
        </section>

        {/* ---------- Requests received ---------- */}
        <section className="mt-7">
          <SectionHeader title="Requests for you" />
          {requests.isLoading ? (
            <ListSkeleton rows={2} />
          ) : (requests.data?.received.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-dashed border-app px-4 py-6 text-center text-sm text-soft">
              Nobody has requested money from you.
            </p>
          ) : (
            <div className="space-y-2.5">
              {requests.data!.received.map((request) => (
                <div key={request.id} className="kyro-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-strong">
                        {formatCurrency(request.amount)}
                      </p>
                      <p className="truncate text-xs text-soft">
                        {request.note || 'No note'} · {formatRelativeDay(request.createdAt)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge>
                  </div>
                  {request.status === 'PENDING' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="save"
                        className="flex-1 py-2.5 text-xs"
                        icon={<Check size={14} />}
                        onClick={() => respond(request, 'ACCEPTED')}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 py-2.5 text-xs"
                        icon={<X size={14} />}
                        onClick={() => respond(request, 'REJECTED')}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------- Requests sent ---------- */}
        <section className="mt-7">
          <SectionHeader title="Requests you sent" />
          {requests.isLoading ? (
            <ListSkeleton rows={2} />
          ) : requests.error ? (
            <ErrorState message={requests.error} onRetry={requests.reload} />
          ) : (requests.data?.sent.length ?? 0) === 0 ? (
            <EmptyState
              icon={<HandCoins size={26} />}
              title="No requests yet"
              description="Request money from a KYRO contact and it will be tracked here."
            />
          ) : (
            <div className="space-y-2.5">
              {requests.data!.sent.map((request) => (
                <div key={request.id} className="kyro-card flex items-center gap-3 p-4">
                  <Avatar
                    name={initialsOf(request.payeeName)}
                    color={colorForName(request.payeeName)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-strong">
                      {request.payeeName}
                    </p>
                    <p className="truncate text-xs text-soft">
                      {request.note || 'No note'} · {formatRelativeDay(request.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-strong">
                      {formatCurrency(request.amount)}
                    </p>
                    <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge>
                  </div>
                  {request.status === 'PENDING' && (
                    <button
                      onClick={() => cancel(request)}
                      aria-label={`Cancel request to ${request.payeeName}`}
                      className="focus-ring ml-1 shrink-0 rounded-full p-1.5 text-soft transition-colors hover:bg-muted"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-soft">
          <Clock size={12} /> Accepting a request marks it as agreed — the payer still completes it
          through Send Money with their PIN.
        </p>
      </PageBody>
    </div>
  )
}

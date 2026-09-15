import { useParams } from 'react-router-dom'
import { Check, Clock, Copy, PiggyBank, X } from 'lucide-react'
import Logo from '../components/Logo'
import { Badge, Button, ErrorState, Skeleton } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useUi } from '../context/UiContext'
import { useApiResource } from '../hooks/useApiResource'
import { transactionService } from '../services'
import {
  CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatCurrency,
  formatDate,
  formatTime,
} from '../utils/format'

export default function TransactionDetail() {
  const { id = '' } = useParams()
  const { showToast } = useUi()
  const resource = useApiResource(() => transactionService.get(id), [id])

  const transaction = resource.data?.transaction
  const isCredit = transaction?.type === 'RECEIVED'

  async function copyReference() {
    if (!transaction) return
    try {
      await navigator.clipboard.writeText(transaction.referenceId)
      showToast('Transaction ID copied')
    } catch {
      showToast('Could not copy the transaction ID.', 'error')
    }
  }

  const statusIcon =
    transaction?.status === 'SUCCESS' ? (
      <Check size={30} strokeWidth={3} className="text-white" />
    ) : transaction?.status === 'FAILED' ? (
      <X size={30} strokeWidth={3} className="text-white" />
    ) : (
      <Clock size={28} strokeWidth={3} className="text-white" />
    )

  const statusColor =
    transaction?.status === 'SUCCESS'
      ? 'bg-mint-500'
      : transaction?.status === 'FAILED'
        ? 'bg-red-500'
        : 'bg-amber-500'

  return (
    <div className="min-h-screen bg-app">
      <PageHeader title="Transaction Details" />

      <PageBody className="max-w-md">
        {resource.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !transaction ? null : (
          <>
            {/* ---------- Receipt header ---------- */}
            <div className="kyro-card overflow-hidden">
              <div className="flex flex-col items-center px-6 pb-6 pt-7">
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${statusColor}`}
                >
                  {statusIcon}
                </div>

                <p className="text-3xl font-extrabold tracking-tight text-strong">
                  {isCredit ? '+' : '−'}
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="mt-1.5 text-sm text-soft">
                  {isCredit ? 'Received from' : 'Paid to'}{' '}
                  <span className="font-semibold text-strong">
                    {isCredit ? transaction.sender.name : transaction.receiver.name}
                  </span>
                </p>
                <div className="mt-3">
                  <Badge
                    tone={
                      transaction.status === 'SUCCESS'
                        ? 'success'
                        : transaction.status === 'FAILED'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {transaction.status}
                  </Badge>
                </div>
              </div>

              {/* Kyro Save contribution from this payment */}
              {transaction.roundUpAmount > 0 && (
                <div className="flex items-center gap-3 border-t border-app bg-mint-50 px-6 py-4 dark:bg-mint-500/10">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-500 text-white">
                    <PiggyBank size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-strong">
                      {formatCurrency(transaction.roundUpAmount)} added to Kyro Save
                    </p>
                    <p className="text-xs text-soft">
                      Rounded up from {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ---------- Detail rows ---------- */}
            <div className="kyro-card mt-4 p-5">
              <div className="mb-4 flex items-center justify-between">
                <Logo size={26} />
                <span className="text-[10px] font-bold uppercase tracking-wide text-soft">
                  Receipt
                </span>
              </div>

              <dl className="space-y-3">
                {[
                  ['Transaction ID', transaction.referenceId],
                  ['Type', TRANSACTION_TYPE_LABELS[transaction.type]],
                  ['Category', CATEGORY_LABELS[transaction.category]],
                  ['Date', formatDate(transaction.createdAt)],
                  ['Time', formatTime(transaction.createdAt)],
                  ['Sender', transaction.sender.name],
                  ...(transaction.sender.upiId ? [['Sender UPI ID', transaction.sender.upiId]] : []),
                  ['Receiver', transaction.receiver.name],
                  ...(transaction.receiver.upiId
                    ? [['Receiver UPI ID', transaction.receiver.upiId]]
                    : []),
                  ...(transaction.description ? [['Note', transaction.description]] : []),
                  ...(transaction.roundUpAmount > 0
                    ? [['Kyro Save', `+${formatCurrency(transaction.roundUpAmount)}`]]
                    : []),
                  ['Payment method', 'KYRO Balance'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-xs text-soft">{label}</dt>
                    <dd className="break-all text-right text-xs font-semibold text-strong">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <Button
                variant="outline"
                fullWidth
                className="mt-5"
                icon={<Copy size={15} />}
                onClick={copyReference}
              >
                Copy transaction ID
              </Button>
            </div>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-soft">
              This is a simulated transaction recorded in the KYRO database for a college project.
              No real money was transferred.
            </p>
          </>
        )}
      </PageBody>
    </div>
  )
}

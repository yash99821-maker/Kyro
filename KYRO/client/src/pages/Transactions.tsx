import { useEffect, useMemo, useState } from 'react'
import { Filter, Receipt, Search, X } from 'lucide-react'
import TransactionRow from '../components/TransactionRow'
import { Button, EmptyState, ErrorState, ListSkeleton } from '../components/ui'
import { useApiResource } from '../hooks/useApiResource'
import { transactionService } from '../services'
import {
  CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  transactionGroupLabel,
} from '../utils/format'
import type { SpendingCategory, Transaction, TransactionType } from '../types'

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier']

export default function Transactions() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [category, setCategory] = useState('all')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  const transactions = useApiResource(
    () =>
      transactionService.list({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        category,
        type,
        status,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        sort,
        limit: 100,
      }),
    [debouncedSearch, category, type, status, from, to, sort],
  )

  const activeFilterCount = [
    category !== 'all',
    type !== 'all',
    status !== 'all',
    Boolean(from),
    Boolean(to),
  ].filter(Boolean).length

  // Bucket into Today / Yesterday / This Week / Earlier for readability.
  const grouped = useMemo(() => {
    const buckets = new Map<string, Transaction[]>()
    for (const transaction of transactions.data?.items ?? []) {
      const label = transactionGroupLabel(transaction.createdAt)
      if (!buckets.has(label)) buckets.set(label, [])
      buckets.get(label)!.push(transaction)
    }
    return GROUP_ORDER.filter((label) => buckets.has(label)).map((label) => ({
      label,
      items: buckets.get(label)!,
    }))
  }, [transactions.data])

  function clearFilters() {
    setCategory('all')
    setType('all')
    setStatus('all')
    setFrom('')
    setTo('')
    setSort('newest')
  }

  return (
    <div className="min-h-screen bg-app">
      <header className="safe-top sticky top-0 z-30 border-b border-app bg-card/95 px-4 pb-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-3 text-xl font-extrabold tracking-tight text-strong">
            Transaction History
          </h1>

          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-app bg-card px-3.5 focus-within:border-kyro-400">
              <Search size={16} className="shrink-0 text-soft" />
              <input
                type="search"
                placeholder="Search by name, note or reference"
                aria-label="Search transactions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent py-3 text-sm text-strong outline-none placeholder:text-soft/60"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="focus-ring shrink-0 rounded-full p-1 text-soft"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
              aria-label="Filters"
              className={`focus-ring relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
                activeFilterCount > 0
                  ? 'border-kyro-400 bg-kyro-50 text-kyro-700 dark:bg-kyro-500/10 dark:text-kyro-200'
                  : 'border-app text-soft hover:bg-muted'
              }`}
            >
              <Filter size={17} />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-kyro-500 text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="animate-fade-up mt-3 space-y-3 rounded-2xl border border-app p-4">
              <FilterRow
                label="Category"
                value={category}
                onChange={setCategory}
                options={[
                  ['all', 'All'],
                  ...Object.entries(CATEGORY_LABELS),
                ]}
              />
              <FilterRow
                label="Type"
                value={type}
                onChange={setType}
                options={[
                  ['all', 'All'],
                  ...(Object.entries(TRANSACTION_TYPE_LABELS) as Array<[TransactionType, string]>),
                ]}
              />
              <FilterRow
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  ['all', 'All'],
                  ['SUCCESS', 'Success'],
                  ['FAILED', 'Failed'],
                  ['PENDING', 'Pending'],
                ]}
              />
              <FilterRow
                label="Sort"
                value={sort}
                onChange={(value) => setSort(value as 'newest' | 'oldest')}
                options={[
                  ['newest', 'Newest first'],
                  ['oldest', 'Oldest first'],
                ]}
              />

              <div>
                <p className="mb-1.5 text-xs font-semibold text-soft">Date range</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="From date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-app bg-card px-3 py-2.5 text-xs text-strong outline-none focus:border-kyro-400"
                  />
                  <span className="shrink-0 text-xs text-soft">to</span>
                  <input
                    type="date"
                    aria-label="To date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-app bg-card px-3 py-2.5 text-xs text-strong outline-none focus:border-kyro-400"
                  />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <Button variant="ghost" fullWidth className="py-2.5 text-xs" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        {transactions.isLoading ? (
          <ListSkeleton rows={6} />
        ) : transactions.error ? (
          <ErrorState message={transactions.error} onRetry={transactions.reload} />
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<Receipt size={26} />}
            title={
              debouncedSearch || activeFilterCount > 0
                ? 'No matching transactions'
                : 'No transactions yet'
            }
            description={
              debouncedSearch || activeFilterCount > 0
                ? 'Try changing your search or clearing the filters.'
                : 'Your payments, recharges and bills will appear here once you make them.'
            }
            action={
              activeFilterCount > 0 ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-soft">
              {transactions.data!.pagination.total} transactions
            </p>
            <div className="space-y-5">
              {grouped.map(({ label, items }) => (
                <section key={label}>
                  <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-soft">
                    {label}
                  </h2>
                  <div className="kyro-card divide-y divide-[color:var(--surface-border)] p-1">
                    {items.map((transaction) => (
                      <TransactionRow key={transaction.id} transaction={transaction} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<[string, string]> | Array<[SpendingCategory | string, string]>
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-soft">{label}</p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {(options as Array<[string, string]>).map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            onClick={() => onChange(optionValue)}
            aria-pressed={value === optionValue}
            className={`focus-ring shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              value === optionValue
                ? 'bg-navy-800 text-white'
                : 'border border-app text-soft hover:bg-muted'
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  )
}

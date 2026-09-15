/**
 * Shared API types.
 *
 * These mirror the Mongoose models on the server. Everything the UI renders
 * comes through one of these shapes — the client keeps no financial state of
 * its own.
 */

export type RoundUpType = 10 | 50

export interface KyroSaveSettings {
  enabled: boolean
  roundUpTo: RoundUpType
  goalName: string
  goalAmount: number
}

export interface User {
  id: string
  name: string
  mobileNumber: string
  email: string
  profileImage: string
  upiId: string
  balance: number
  savingsBalance: number
  kyroSave: KyroSaveSettings
  isDemo: boolean
  createdAt: string
  updatedAt: string
}

export type TransactionType = 'PAYMENT' | 'RECEIVED' | 'RECHARGE' | 'BILL' | 'GROUP' | 'SAVING'
export type TransactionStatus = 'SUCCESS' | 'FAILED' | 'PENDING'

export type SpendingCategory =
  | 'food'
  | 'shopping'
  | 'travel'
  | 'bills'
  | 'recharge'
  | 'entertainment'
  | 'healthcare'
  | 'transfer'
  | 'other'

export interface TransactionParty {
  name: string
  upiId: string
  userId?: string
}

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  category: SpendingCategory
  sender: TransactionParty
  receiver: TransactionParty
  status: TransactionStatus
  description: string
  referenceId: string
  roundUpAmount: number
  meta: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Saving {
  id: string
  userId: string
  transactionId: string | null
  originalAmount: number
  roundedAmount: number
  savedAmount: number
  roundUpType: RoundUpType
  label: string
  createdAt: string
}

export interface SavingsSummary {
  totalSaved: number
  lifetimeRoundUps: number
  roundUpCount: number
  goalName: string
  goalAmount: number
  progressPercent: number
  remainingToGoal: number
  enabled: boolean
  roundUpTo: RoundUpType
}

export interface GroupMember {
  _id: string
  id?: string
  userId: string | null
  name: string
  mobileNumber: string
}

export interface Group {
  id: string
  name: string
  description: string
  emoji: string
  createdBy: string
  members: GroupMember[]
  createdAt: string
  updatedAt: string
}

export interface GroupListItem extends Group {
  memberCount: number
  totalExpenses: number
  yourNet: number
}

export type SplitType = 'EQUAL' | 'CUSTOM'

export interface ExpenseParticipant {
  memberId: string
  share: number
}

export interface Expense {
  id: string
  groupId: string
  description: string
  amount: number
  paidBy: string
  splitType: SplitType
  participants: ExpenseParticipant[]
  createdAt: string
}

export interface Settlement {
  id: string
  groupId: string
  fromMemberId: string
  toMemberId: string
  amount: number
  status: 'PENDING' | 'COMPLETED'
  note: string
  settledAt: string | null
  createdAt: string
}

export interface MemberBalance {
  memberId: string
  name: string
  userId: string | null
  paid: number
  share: number
  net: number
}

export interface DebtEdge {
  fromMemberId: string
  fromName: string
  toMemberId: string
  toName: string
  amount: number
}

export interface GroupBalances {
  totalExpenses: number
  memberBalances: MemberBalance[]
  debts: DebtEdge[]
  yourNet: number
  yourMemberId: string | null
}

export interface GroupDetail {
  group: Group
  expenses: Expense[]
  settlements: Settlement[]
  balances: GroupBalances
}

export type InsightTone = 'warning' | 'positive' | 'info' | 'goal'

export interface Insight {
  id: string
  icon: string
  tone: InsightTone
  title: string
  message: string
}

export interface CategoryTotal {
  category: SpendingCategory
  label: string
  total: number
  percent: number
}

export interface InsightsReport {
  totals: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
    weekChangePercent: number | null
    monthChangePercent: number | null
  }
  topCategory: CategoryTotal | null
  categoriesThisMonth: CategoryTotal[]
  categoriesThisWeek: CategoryTotal[]
  weeklySeries: Array<{ date: string; label: string; total: number }>
  monthlySeries: Array<{ month: string; label: string; total: number }>
  insights: Insight[]
  savings: { totalSaved: number; goalName: string; goalAmount: number; progressPercent: number }
  hasData: boolean
}

export type NotificationType =
  | 'PAYMENT'
  | 'RECEIVED'
  | 'SAVING'
  | 'GROUP'
  | 'INSIGHT'
  | 'REQUEST'
  | 'SYSTEM'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  link: string
  createdAt: string
}

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface MoneyRequest {
  id: string
  requesterId: string
  payeeName: string
  payeeUpiId: string
  payeeUserId: string | null
  amount: number
  note: string
  status: RequestStatus
  createdAt: string
}

export interface DirectoryUser {
  id: string
  name: string
  upiId: string
  mobileNumber: string
  profileImage: string
}

/** What every successful payment endpoint returns. */
export interface PaymentResult {
  transaction: Transaction
  savedAmount: number
  balance: number
  savingsBalance: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface TransactionListResult {
  items: Transaction[]
  pagination: Pagination
}

export interface TransactionFilters {
  search?: string
  category?: string
  type?: string
  status?: string
  from?: string
  to?: string
  sort?: 'newest' | 'oldest'
  page?: number
  limit?: number
}

import { api, unwrap } from './api'
import type {
  AppNotification,
  DirectoryUser,
  Group,
  GroupBalances,
  GroupDetail,
  GroupListItem,
  InsightsReport,
  MoneyRequest,
  PaymentResult,
  Saving,
  SavingsSummary,
  SpendingCategory,
  Transaction,
  TransactionFilters,
  TransactionListResult,
  User,
} from '../types'

/* ============================ AUTH ============================ */

export const authService = {
  requestOtp: (mobileNumber: string) =>
    unwrap<{ mobileNumber: string; isExistingUser: boolean; name: string | null; demoMode: boolean }>(
      api.post('/auth/login', { mobileNumber }),
    ),

  verifyOtp: (mobileNumber: string, otp: string, name?: string) =>
    unwrap<{ token: string; user: User; isNewUser: boolean }>(
      api.post('/auth/verify-otp', { mobileNumber, otp, ...(name ? { name } : {}) }),
    ),

  me: () => unwrap<{ user: User }>(api.get('/auth/me')),

  logout: () => api.post('/auth/logout'),
}

/* ============================ USERS ============================ */

export const userService = {
  getProfile: () => unwrap<{ user: User }>(api.get('/users/me')),

  updateProfile: (payload: { name?: string; email?: string; profileImage?: string }) =>
    unwrap<{ user: User }>(api.put('/users/me', payload)),

  changePin: (currentPin: string, newPin: string) =>
    api.put('/users/me/pin', { currentPin, newPin }),

  directory: () => unwrap<DirectoryUser[]>(api.get('/users/directory')),

  lookupUpi: (upiId: string) =>
    unwrap<{ found: boolean; name?: string; upiId?: string; verified?: boolean }>(
      api.get('/users/lookup', { params: { upiId } }),
    ),
}

/* =========================== PAYMENTS =========================== */

export interface SendMoneyPayload {
  receiverName: string
  receiverUpiId?: string
  amount: number
  note?: string
  category: SpendingCategory
  pin: string
}

export const paymentService = {
  send: (payload: SendMoneyPayload) => unwrap<PaymentResult>(api.post('/payments/send', payload)),

  scan: (payload: {
    qrPayload: string
    amount: number
    note?: string
    category: SpendingCategory
    pin: string
  }) => unwrap<PaymentResult>(api.post('/payments/scan', payload)),

  resolveQr: (payload: string) =>
    unwrap<{ name: string; upiId: string; verified: boolean; isKyroUser: boolean }>(
      api.get('/payments/resolve-qr', { params: { payload } }),
    ),

  recharge: (payload: {
    mobileNumber: string
    operator: string
    amount: number
    pin: string
  }) => unwrap<PaymentResult>(api.post('/payments/recharge', payload)),

  payBill: (payload: {
    billType: string
    provider: string
    consumerNumber: string
    amount: number
    pin: string
  }) => unwrap<PaymentResult>(api.post('/payments/bill', payload)),
}

/* ========================= TRANSACTIONS ========================= */

export const transactionService = {
  list: (filters: TransactionFilters = {}) =>
    unwrap<TransactionListResult>(api.get('/transactions', { params: filters })),

  get: (id: string) => unwrap<{ transaction: Transaction }>(api.get(`/transactions/${id}`)),

  summary: () =>
    unwrap<{ todaySpent: number; todayReceived: number; todayCount: number }>(
      api.get('/transactions/summary'),
    ),
}

/* ========================== KYRO SAVE ========================== */

export const savingsService = {
  get: () =>
    unwrap<{ summary: SavingsSummary; recent: Saving[] }>(api.get('/savings')),

  history: (page = 1, limit = 50) =>
    unwrap<{ items: Saving[]; pagination: { page: number; pages: number; total: number } }>(
      api.get('/savings/history', { params: { page, limit } }),
    ),

  updateSettings: (payload: {
    enabled?: boolean
    roundUpTo?: 10 | 50
    goalName?: string
    goalAmount?: number
  }) => unwrap<{ summary: SavingsSummary }>(api.put('/savings/settings', payload)),
}

/* ========================= KYRO GROUPS ========================= */

export const groupService = {
  list: () => unwrap<GroupListItem[]>(api.get('/groups')),

  create: (payload: {
    name: string
    description?: string
    emoji?: string
    members?: Array<{ name: string; mobileNumber?: string }>
  }) => unwrap<{ group: Group }>(api.post('/groups', payload)),

  get: (id: string) => unwrap<GroupDetail>(api.get(`/groups/${id}`)),

  remove: (id: string) => api.delete(`/groups/${id}`),

  addMember: (id: string, payload: { name: string; mobileNumber?: string }) =>
    unwrap<{ group: Group }>(api.post(`/groups/${id}/members`, payload)),

  removeMember: (id: string, memberId: string) =>
    unwrap<{ group: Group }>(api.delete(`/groups/${id}/members/${memberId}`)),

  addExpense: (
    id: string,
    payload: {
      description: string
      amount: number
      paidBy: string
      splitType: 'EQUAL' | 'CUSTOM'
      participants: Array<{ memberId: string; share?: number }>
    },
  ) => unwrap<{ balances: GroupBalances }>(api.post(`/groups/${id}/expenses`, payload)),

  deleteExpense: (id: string, expenseId: string) =>
    unwrap<{ balances: GroupBalances }>(api.delete(`/groups/${id}/expenses/${expenseId}`)),

  balances: (id: string) => unwrap<GroupBalances>(api.get(`/groups/${id}/balances`)),

  settle: (
    id: string,
    payload: { fromMemberId: string; toMemberId: string; amount: number; note?: string },
  ) => unwrap<{ balances: GroupBalances }>(api.post(`/groups/${id}/settle`, payload)),
}

/* =========================== KYRO AI =========================== */

export const insightsService = {
  get: () => unwrap<InsightsReport>(api.get('/insights')),

  weekly: () =>
    unwrap<{
      current: Array<{ date: string; label: string; total: number }>
      previous: Array<{ date: string; label: string; total: number }>
    }>(api.get('/insights/weekly')),

  monthly: () =>
    unwrap<{ series: Array<{ month: string; label: string; total: number }> }>(
      api.get('/insights/monthly'),
    ),
}

/* ======================== NOTIFICATIONS ======================== */

export const notificationService = {
  list: () =>
    unwrap<{ items: AppNotification[]; unreadCount: number }>(api.get('/notifications')),

  markRead: (id: string) => api.put(`/notifications/${id}/read`),

  markAllRead: () => api.put('/notifications/read-all'),
}

/* ========================== REQUESTS ========================== */

export const requestService = {
  list: () =>
    unwrap<{ sent: MoneyRequest[]; received: MoneyRequest[] }>(api.get('/requests')),

  create: (payload: {
    payeeName: string
    payeeUpiId?: string
    amount: number
    note?: string
  }) => unwrap<{ request: MoneyRequest }>(api.post('/requests', payload)),

  updateStatus: (id: string, status: 'ACCEPTED' | 'REJECTED') =>
    unwrap<{ request: MoneyRequest }>(api.put(`/requests/${id}/status`, { status })),

  cancel: (id: string) => api.delete(`/requests/${id}`),
}

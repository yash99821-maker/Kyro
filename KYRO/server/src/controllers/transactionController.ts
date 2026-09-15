import { Types, type FilterQuery } from 'mongoose'
import type { Request, Response } from 'express'
import { currentUser } from '../middleware/auth.js'
import { Transaction, type ITransaction } from '../models/Transaction.js'
import { ApiError } from '../utils/ApiError.js'
import { roundMoney } from '../utils/money.js'

/**
 * GET /api/transactions
 *
 * Search + filter + sort + paginate, all executed by MongoDB rather than in
 * the browser, so the history page stays fast as the collection grows.
 */
export async function listTransactions(req: Request, res: Response) {
  const user = currentUser(req)
  const { search, category, type, status, from, to, sort, page, limit } = req.query as unknown as {
    search?: string
    category?: string
    type?: string
    status?: string
    from?: string
    to?: string
    sort: 'newest' | 'oldest'
    page: number
    limit: number
  }

  const filter: FilterQuery<ITransaction> = { userId: user._id }

  if (category && category !== 'all') filter.category = category
  if (type && type !== 'all') filter.type = type
  if (status && status !== 'all') filter.status = status

  if (from || to) {
    const createdAt: Record<string, Date> = {}
    if (from) {
      const d = new Date(from)
      if (!Number.isNaN(d.getTime())) createdAt.$gte = d
    }
    if (to) {
      const d = new Date(to)
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999)
        createdAt.$lte = d
      }
    }
    if (Object.keys(createdAt).length > 0) filter.createdAt = createdAt
  }

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [
      { 'receiver.name': rx },
      { 'sender.name': rx },
      { description: rx },
      { referenceId: rx },
    ]
  }

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: sort === 'oldest' ? 1 : -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: {
      items: items.map((t) => t.toJSON()),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  })
}

/** GET /api/transactions/:id */
export async function getTransaction(req: Request, res: Response) {
  const user = currentUser(req)
  const { id } = req.params

  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Transaction not found.')

  const transaction = await Transaction.findOne({ _id: id, userId: user._id })
  if (!transaction) throw ApiError.notFound('Transaction not found.')

  res.json({ success: true, data: { transaction: transaction.toJSON() } })
}

/**
 * GET /api/transactions/summary
 * Small aggregate used by the dashboard header (today + this month).
 */
export async function getSummary(req: Request, res: Response) {
  const user = currentUser(req)

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const rows = await Transaction.aggregate<{ _id: string; total: number; count: number }>([
    { $match: { userId: user._id, status: 'SUCCESS', createdAt: { $gte: startOfToday } } },
    {
      $group: {
        _id: { $cond: [{ $eq: ['$type', 'RECEIVED'] }, 'in', 'out'] },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ])

  const inflow = rows.find((r) => r._id === 'in')
  const outflow = rows.find((r) => r._id === 'out')

  res.json({
    success: true,
    data: {
      todaySpent: roundMoney(outflow?.total ?? 0),
      todayReceived: roundMoney(inflow?.total ?? 0),
      todayCount: (outflow?.count ?? 0) + (inflow?.count ?? 0),
    },
  })
}

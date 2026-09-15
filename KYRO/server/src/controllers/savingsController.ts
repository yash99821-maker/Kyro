import type { Request, Response } from 'express'
import { currentUser } from '../middleware/auth.js'
import { Saving } from '../models/Saving.js'
import { getSavingsSummary } from '../services/savingsService.js'

/** GET /api/savings — totals, goal progress and the latest round-ups. */
export async function getSavings(req: Request, res: Response) {
  const user = currentUser(req)

  const [summary, recent] = await Promise.all([
    getSavingsSummary(user._id, user),
    Saving.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
  ])

  res.json({
    success: true,
    data: { summary, recent: recent.map((s) => s.toJSON()) },
  })
}

/** GET /api/savings/history — the full round-up ledger, paginated. */
export async function getSavingsHistory(req: Request, res: Response) {
  const user = currentUser(req)
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)))

  const [items, total] = await Promise.all([
    Saving.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Saving.countDocuments({ userId: user._id }),
  ])

  res.json({
    success: true,
    data: {
      items: items.map((s) => s.toJSON()),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  })
}

/** PUT /api/savings/settings — toggle Kyro Save, round-up size and goal. */
export async function updateSavingsSettings(req: Request, res: Response) {
  const user = currentUser(req)
  const { enabled, roundUpTo, goalName, goalAmount } = req.body as {
    enabled?: boolean
    roundUpTo?: 10 | 50
    goalName?: string
    goalAmount?: number
  }

  if (enabled !== undefined) user.kyroSave.enabled = enabled
  if (roundUpTo !== undefined) user.kyroSave.roundUpTo = roundUpTo
  if (goalName !== undefined) user.kyroSave.goalName = goalName
  if (goalAmount !== undefined) user.kyroSave.goalAmount = goalAmount

  await user.save()

  const summary = await getSavingsSummary(user._id, user)
  res.json({ success: true, message: 'Kyro Save settings updated', data: { summary } })
}

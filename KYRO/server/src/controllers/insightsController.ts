import type { Request, Response } from 'express'
import { currentUser } from '../middleware/auth.js'
import {
  buildInsights,
  dailySpendSeries,
  monthlySpendSeries,
  spendByCategory,
  toCategoryTotals,
} from '../services/insightsService.js'
import { addDays, addMonths, startOfMonth, startOfWeek } from '../utils/dates.js'

/** GET /api/insights — the full Kyro AI report. */
export async function getInsights(req: Request, res: Response) {
  const user = currentUser(req)
  const report = await buildInsights(user)
  res.json({ success: true, data: report })
}

/** GET /api/insights/weekly — this week vs last week, day by day. */
export async function getWeekly(req: Request, res: Response) {
  const user = currentUser(req)
  const thisWeekStart = startOfWeek(new Date())

  const [current, previous] = await Promise.all([
    dailySpendSeries(user._id, thisWeekStart, 7),
    dailySpendSeries(user._id, addDays(thisWeekStart, -7), 7),
  ])

  res.json({ success: true, data: { current, previous } })
}

/** GET /api/insights/monthly — last 6 months of spending. */
export async function getMonthly(req: Request, res: Response) {
  const user = currentUser(req)
  const series = await monthlySpendSeries(user._id, 6)
  res.json({ success: true, data: { series } })
}

/** GET /api/insights/categories?period=week|month */
export async function getCategories(req: Request, res: Response) {
  const user = currentUser(req)
  const period = req.query.period === 'week' ? 'week' : 'month'

  const from = period === 'week' ? startOfWeek(new Date()) : startOfMonth(new Date())
  const to = period === 'week' ? addDays(from, 7) : addMonths(from, 1)

  const map = await spendByCategory(user._id, from, to)
  res.json({ success: true, data: { period, categories: toCategoryTotals(map) } })
}

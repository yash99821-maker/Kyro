import type { Types } from 'mongoose'
import { Transaction } from '../models/Transaction.js'
import type { IUser } from '../models/User.js'
import { roundMoney, formatInr } from '../utils/money.js'
import { addDays, addMonths, startOfMonth, startOfWeek } from '../utils/dates.js'

/**
 * ============================================================
 * KYRO AI - rule-based spending intelligence
 * ============================================================
 *
 * This is NOT a machine-learning model. It is a deterministic rule engine:
 * it reads the user's real transactions out of MongoDB, buckets the spend by
 * category and by time window, compares one window against the previous one,
 * and emits a plain-language insight whenever a rule threshold is crossed.
 *
 * The rules, in order of priority:
 *   R1  a category rose by >= 20% week-on-week      -> warning
 *   R2  a category fell by >= 15% week-on-week      -> positive
 *   R3  the biggest category this month             -> informational
 *   R4  total month-on-month change                 -> warning or positive
 *   R5  Kyro Save goal progress                     -> encouragement
 *   R6  savings rate (saved vs spent) this month    -> informational
 *
 * Everything is explainable, which is exactly what you want when a teacher
 * asks "how does this work?" during a viva.
 */

/** Transaction types that represent money going out. */
const OUTFLOW_TYPES = ['PAYMENT', 'RECHARGE', 'BILL', 'GROUP'] as const

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  shopping: 'Shopping',
  travel: 'Travel',
  bills: 'Bills',
  recharge: 'Recharge',
  entertainment: 'Entertainment',
  healthcare: 'Healthcare',
  transfer: 'Transfers',
  other: 'Other',
}

export function labelForCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? 'Other'
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
  category: string
  label: string
  total: number
  percent: number
}

/** Sums successful outgoing spend per category inside a date window. */
async function spendByCategory(userId: Types.ObjectId, from: Date, to: Date) {
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId,
        status: 'SUCCESS',
        type: { $in: [...OUTFLOW_TYPES] },
        createdAt: { $gte: from, $lt: to },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ])

  const map = new Map<string, number>()
  for (const row of rows) map.set(row._id, roundMoney(row.total))
  return map
}

function sumMap(map: Map<string, number>): number {
  let total = 0
  for (const value of map.values()) total += value
  return roundMoney(total)
}

function toCategoryTotals(map: Map<string, number>): CategoryTotal[] {
  const total = sumMap(map)
  return [...map.entries()]
    .map(([category, value]) => ({
      category,
      label: labelForCategory(category),
      total: value,
      percent: total > 0 ? roundMoney((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

/** Percentage change from `previous` to `current`, guarding divide-by-zero. */
function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0
  return roundMoney(((current - previous) / previous) * 100)
}

/** Daily spend totals across a window - powers the weekly bar chart. */
export async function dailySpendSeries(userId: Types.ObjectId, from: Date, days: number) {
  const to = addDays(from, days)
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId,
        status: 'SUCCESS',
        type: { $in: [...OUTFLOW_TYPES] },
        createdAt: { $gte: from, $lt: to },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$amount' },
      },
    },
  ])

  const byDate = new Map(rows.map((r) => [r._id, roundMoney(r.total)]))
  const series: Array<{ date: string; label: string; total: number }> = []
  for (let i = 0; i < days; i += 1) {
    const day = addDays(from, i)
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    series.push({
      date: key,
      label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      total: byDate.get(key) ?? 0,
    })
  }
  return series
}

/** Month-by-month spend totals for the last `months` months. */
export async function monthlySpendSeries(userId: Types.ObjectId, months = 6) {
  const from = startOfMonth(addMonths(new Date(), -(months - 1)))
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId,
        status: 'SUCCESS',
        type: { $in: [...OUTFLOW_TYPES] },
        createdAt: { $gte: from },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        total: { $sum: '$amount' },
      },
    },
  ])

  const byMonth = new Map(rows.map((r) => [r._id, roundMoney(r.total)]))
  const series: Array<{ month: string; label: string; total: number }> = []
  for (let i = 0; i < months; i += 1) {
    const d = addMonths(from, i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    series.push({
      month: key,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      total: byMonth.get(key) ?? 0,
    })
  }
  return series
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

/** Builds the full Kyro AI report for a user. */
export async function buildInsights(user: IUser): Promise<InsightsReport> {
  const userId = user._id
  const now = new Date()

  const thisWeekStart = startOfWeek(now)
  const lastWeekStart = addDays(thisWeekStart, -7)
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = addMonths(thisMonthStart, -1)

  const [thisWeekMap, lastWeekMap, thisMonthMap, lastMonthMap, weeklySeries, monthlySeries] =
    await Promise.all([
      spendByCategory(userId, thisWeekStart, addDays(thisWeekStart, 7)),
      spendByCategory(userId, lastWeekStart, thisWeekStart),
      spendByCategory(userId, thisMonthStart, addMonths(thisMonthStart, 1)),
      spendByCategory(userId, lastMonthStart, thisMonthStart),
      dailySpendSeries(userId, thisWeekStart, 7),
      monthlySpendSeries(userId, 6),
    ])

  const thisWeekTotal = sumMap(thisWeekMap)
  const lastWeekTotal = sumMap(lastWeekMap)
  const thisMonthTotal = sumMap(thisMonthMap)
  const lastMonthTotal = sumMap(lastMonthMap)

  const categoriesThisMonth = toCategoryTotals(thisMonthMap)
  const categoriesThisWeek = toCategoryTotals(thisWeekMap)
  const topCategory = categoriesThisMonth[0] ?? null

  const weekInsights: Insight[] = []

  // --- R1 / R2: week-on-week movement per category -----------------------
  for (const [category, current] of thisWeekMap.entries()) {
    const previous = lastWeekMap.get(category) ?? 0
    const change = percentChange(current, previous)
    if (change === null) continue

    const label = labelForCategory(category)
    if (change >= 20) {
      weekInsights.push({
        id: `up-${category}`,
        icon: '⚠️',
        tone: 'warning',
        title: `${label} spending is up`,
        message: `Your ${label.toLowerCase()} spending increased ${Math.round(change)}% this week — ${formatInr(current)} vs ${formatInr(previous)} last week.`,
      })
    } else if (change <= -15) {
      weekInsights.push({
        id: `down-${category}`,
        icon: '💡',
        tone: 'positive',
        title: `Nice work on ${label.toLowerCase()}`,
        message: `You spent ${Math.abs(Math.round(change))}% less on ${label.toLowerCase()} this week — ${formatInr(roundMoney(previous - current))} less than last week.`,
      })
    }
  }

  // Surface warnings before positives, and keep the list digestible.
  weekInsights.sort((a, b) => Number(b.tone === 'warning') - Number(a.tone === 'warning'))
  const insights: Insight[] = weekInsights.slice(0, 4)

  // --- R3: top category this month ---------------------------------------
  if (topCategory && topCategory.total > 0) {
    insights.push({
      id: 'top-category',
      icon: '📊',
      tone: 'info',
      title: `${topCategory.label} is your top category`,
      message: `${topCategory.label} accounts for ${Math.round(topCategory.percent)}% of your spending this month (${formatInr(topCategory.total)}).`,
    })
  }

  // --- R4: month-on-month total ------------------------------------------
  const monthChange = percentChange(thisMonthTotal, lastMonthTotal)
  if (monthChange !== null && lastMonthTotal > 0) {
    if (monthChange <= -5) {
      insights.push({
        id: 'month-down',
        icon: '🎉',
        tone: 'positive',
        title: 'Spending is down this month',
        message: `You have spent ${formatInr(roundMoney(lastMonthTotal - thisMonthTotal))} less than last month so far.`,
      })
    } else if (monthChange >= 25) {
      insights.push({
        id: 'month-up',
        icon: '⚠️',
        tone: 'warning',
        title: 'Spending is up this month',
        message: `You are ${Math.round(monthChange)}% above last month at ${formatInr(thisMonthTotal)}, compared with ${formatInr(lastMonthTotal)}.`,
      })
    }
  }

  // --- R5: Kyro Save goal progress ---------------------------------------
  const goalAmount = user.kyroSave.goalAmount || 1
  const progressPercent = Math.min(100, roundMoney((user.savingsBalance / goalAmount) * 100))
  if (user.savingsBalance > 0) {
    insights.push({
      id: 'goal-progress',
      icon: '🎯',
      tone: 'goal',
      title: `${Math.round(progressPercent)}% towards ${user.kyroSave.goalName}`,
      message:
        progressPercent >= 100
          ? `You reached your ${user.kyroSave.goalName} goal — ${formatInr(user.savingsBalance)} saved through round-ups.`
          : `${formatInr(user.savingsBalance)} saved so far. ${formatInr(roundMoney(goalAmount - user.savingsBalance))} to go on ${user.kyroSave.goalName}.`,
    })
  }

  // --- R6: savings rate ---------------------------------------------------
  if (thisMonthTotal > 0 && user.savingsBalance > 0) {
    const rate = roundMoney((user.savingsBalance / (thisMonthTotal + user.savingsBalance)) * 100)
    insights.push({
      id: 'savings-rate',
      icon: '🪙',
      tone: 'info',
      title: 'Your savings rate',
      message: `${rate}% of the money leaving your KYRO account this month went into savings instead of spending.`,
    })
  }

  return {
    totals: {
      thisWeek: thisWeekTotal,
      lastWeek: lastWeekTotal,
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      weekChangePercent: percentChange(thisWeekTotal, lastWeekTotal),
      monthChangePercent: monthChange,
    },
    topCategory,
    categoriesThisMonth,
    categoriesThisWeek,
    weeklySeries,
    monthlySeries,
    insights,
    savings: {
      totalSaved: roundMoney(user.savingsBalance),
      goalName: user.kyroSave.goalName,
      goalAmount: user.kyroSave.goalAmount,
      progressPercent,
    },
    hasData: thisMonthTotal > 0 || lastMonthTotal > 0 || thisWeekTotal > 0,
  }
}

export { spendByCategory, toCategoryTotals }

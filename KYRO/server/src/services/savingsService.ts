import type { ClientSession, Types } from 'mongoose'
import { Saving } from '../models/Saving.js'
import type { IUser, RoundUpType } from '../models/User.js'
import { roundMoney } from '../utils/money.js'

/**
 * ============================================================
 * KYRO SAVE — round-up business logic
 * ============================================================
 *
 * The idea: every time you pay, KYRO rounds the amount up to the next ₹10 or
 * ₹50 and moves the difference into your savings pot.
 *
 *   ₹87  rounded to the nearest ₹10 -> ₹90   -> ₹3 saved
 *   ₹126 rounded to the nearest ₹10 -> ₹130  -> ₹4 saved
 *   ₹126 rounded to the nearest ₹50 -> ₹150  -> ₹24 saved
 *
 * Note the deliberate rule for exact multiples: paying ₹100 with a ₹10
 * round-up saves ₹0, not ₹10 — the user should never be charged extra for an
 * amount that is already round.
 *
 * This runs on the server only. The client never computes or submits a
 * savings amount; it just displays what the API returns.
 */
export function calculateRoundUp(amount: number, roundTo: RoundUpType) {
  const roundedAmount = roundMoney(Math.ceil(amount / roundTo) * roundTo)
  const savedAmount = roundMoney(roundedAmount - amount)
  return { originalAmount: roundMoney(amount), roundedAmount, savedAmount }
}

export interface RoundUpOutcome {
  savedAmount: number
  roundedAmount: number
  /** False when Kyro Save is off, the amount is already round, or funds are short. */
  applied: boolean
}

/**
 * Applies the round-up for a completed payment:
 *   1. skip entirely if Kyro Save is disabled for this user
 *   2. skip if the round-up works out to ₹0
 *   3. skip if the user cannot afford the extra amount (never overdraw)
 *   4. otherwise move the money from balance -> savingsBalance and log a
 *      Saving document so the savings history is auditable.
 *
 * The caller is responsible for saving the mutated `user` document.
 */
export async function applyRoundUp(
  user: IUser,
  amount: number,
  transactionId: Types.ObjectId | null,
  label: string,
  session?: ClientSession,
): Promise<RoundUpOutcome> {
  if (!user.kyroSave?.enabled) {
    return { savedAmount: 0, roundedAmount: roundMoney(amount), applied: false }
  }

  const roundTo = (user.kyroSave.roundUpTo ?? 10) as RoundUpType
  const { roundedAmount, savedAmount, originalAmount } = calculateRoundUp(amount, roundTo)

  if (savedAmount <= 0 || user.balance < savedAmount) {
    return { savedAmount: 0, roundedAmount, applied: false }
  }

  user.balance = roundMoney(user.balance - savedAmount)
  user.savingsBalance = roundMoney(user.savingsBalance + savedAmount)

  await Saving.create(
    [
      {
        userId: user._id,
        transactionId,
        originalAmount,
        roundedAmount,
        savedAmount,
        roundUpType: roundTo,
        label,
      },
    ],
    session ? { session } : {},
  )

  return { savedAmount, roundedAmount, applied: true }
}

/** Aggregated figures for the Kyro Save page and the dashboard pot. */
export async function getSavingsSummary(userId: Types.ObjectId, user: IUser) {
  const [agg] = await Saving.aggregate<{ total: number; count: number }>([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: '$savedAmount' }, count: { $sum: 1 } } },
  ])

  const goalAmount = user.kyroSave.goalAmount || 1
  const totalSaved = roundMoney(user.savingsBalance)

  return {
    totalSaved,
    lifetimeRoundUps: roundMoney(agg?.total ?? 0),
    roundUpCount: agg?.count ?? 0,
    goalName: user.kyroSave.goalName,
    goalAmount: user.kyroSave.goalAmount,
    progressPercent: Math.min(100, roundMoney((totalSaved / goalAmount) * 100)),
    remainingToGoal: roundMoney(Math.max(0, user.kyroSave.goalAmount - totalSaved)),
    enabled: user.kyroSave.enabled,
    roundUpTo: user.kyroSave.roundUpTo,
  }
}

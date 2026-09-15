import { Types } from 'mongoose'
import { Expense } from '../models/Expense.js'
import { Group, type IGroup } from '../models/Group.js'
import { Settlement } from '../models/Settlement.js'
import { ApiError } from '../utils/ApiError.js'
import { roundMoney } from '../utils/money.js'

/**
 * ============================================================
 * KYRO GROUPS - bill splitting and settlement maths
 * ============================================================
 *
 * Balances are never stored. They are always derived from the two source
 * collections, so they can never drift out of sync with reality:
 *
 *   net(member) = (what they paid)
 *               - (their share of every expense)
 *               + (settlements they have received)
 *               - (settlements they have paid)
 *
 * A positive net means the group owes that member money.
 * A negative net means that member owes the group money.
 *
 * Those net positions are then turned into a minimal list of "who pays whom"
 * by repeatedly matching the largest creditor with the largest debtor. For a
 * group of N people this produces at most N-1 transfers instead of N*(N-1)/2.
 */

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
  /** Net position of the requesting user inside this group. */
  yourNet: number
  yourMemberId: string | null
}

/**
 * Splits `amount` equally between `count` participants, distributing the
 * leftover paise across the first few shares so the shares always add up to
 * exactly the expense amount (e.g. 100 / 3 -> 33.34, 33.33, 33.33).
 */
export function splitEqually(amount: number, count: number): number[] {
  if (count <= 0) return []
  const totalPaise = Math.round(amount * 100)
  const base = Math.floor(totalPaise / count)
  const remainder = totalPaise - base * count
  return Array.from({ length: count }, (_, i) => roundMoney((base + (i < remainder ? 1 : 0)) / 100))
}

/** Confirms every id refers to a member of this group. */
export function assertMembersExist(group: IGroup, memberIds: string[]): void {
  const known = new Set(group.members.map((m) => String(m._id)))
  for (const id of memberIds) {
    if (!known.has(id)) {
      throw ApiError.badRequest('One of the selected people is not a member of this group.')
    }
  }
}

/**
 * Validates a custom split: every share must be non-negative and the shares
 * must add up to the expense total (tolerance of 1 paisa for rounding).
 */
export function assertCustomSplitBalances(
  amount: number,
  participants: Array<{ share: number }>,
): void {
  if (participants.length === 0) {
    throw ApiError.badRequest('Select at least one person to split this expense with.')
  }
  const total = roundMoney(participants.reduce((sum, p) => sum + p.share, 0))
  if (participants.some((p) => p.share < 0)) {
    throw ApiError.badRequest('Split amounts cannot be negative.')
  }
  if (Math.abs(total - roundMoney(amount)) > 0.01) {
    throw ApiError.badRequest(
      `Split amounts add up to ₹${total.toFixed(2)} but the expense is ₹${roundMoney(amount).toFixed(2)}. Please adjust.`,
    )
  }
}

/** Computes every member's net position plus the minimal settlement plan. */
export async function computeGroupBalances(
  group: IGroup,
  viewerUserId?: Types.ObjectId,
): Promise<GroupBalances> {
  const [expenses, settlements] = await Promise.all([
    Expense.find({ groupId: group._id }).lean(),
    Settlement.find({ groupId: group._id, status: 'COMPLETED' }).lean(),
  ])

  const paid = new Map<string, number>()
  const share = new Map<string, number>()
  for (const member of group.members) {
    paid.set(String(member._id), 0)
    share.set(String(member._id), 0)
  }

  let totalExpenses = 0
  for (const expense of expenses) {
    totalExpenses += expense.amount
    const payer = String(expense.paidBy)
    paid.set(payer, roundMoney((paid.get(payer) ?? 0) + expense.amount))
    for (const participant of expense.participants) {
      const key = String(participant.memberId)
      share.set(key, roundMoney((share.get(key) ?? 0) + participant.share))
    }
  }

  // A completed settlement cancels debt: the payer's net rises, the
  // receiver's net falls by the same amount.
  const settledOut = new Map<string, number>()
  const settledIn = new Map<string, number>()
  for (const s of settlements) {
    const from = String(s.fromMemberId)
    const to = String(s.toMemberId)
    settledOut.set(from, roundMoney((settledOut.get(from) ?? 0) + s.amount))
    settledIn.set(to, roundMoney((settledIn.get(to) ?? 0) + s.amount))
  }

  const memberBalances: MemberBalance[] = group.members.map((member) => {
    const id = String(member._id)
    const memberPaid = paid.get(id) ?? 0
    const memberShare = share.get(id) ?? 0
    const net = roundMoney(
      memberPaid - memberShare + (settledOut.get(id) ?? 0) - (settledIn.get(id) ?? 0),
    )
    return {
      memberId: id,
      name: member.name,
      userId: member.userId ? String(member.userId) : null,
      paid: roundMoney(memberPaid),
      share: roundMoney(memberShare),
      net,
    }
  })

  const debts = buildSettlementPlan(memberBalances)

  const viewerMember = viewerUserId
    ? memberBalances.find((m) => m.userId === String(viewerUserId))
    : undefined

  return {
    totalExpenses: roundMoney(totalExpenses),
    memberBalances,
    debts,
    yourNet: viewerMember?.net ?? 0,
    yourMemberId: viewerMember?.memberId ?? null,
  }
}

/**
 * Greedy debt simplification: repeatedly settle the largest debtor against
 * the largest creditor until everyone is square.
 */
function buildSettlementPlan(balances: MemberBalance[]): DebtEdge[] {
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ ...b, remaining: b.net }))
    .sort((a, b) => b.remaining - a.remaining)
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ ...b, remaining: -b.net }))
    .sort((a, b) => b.remaining - a.remaining)

  const debts: DebtEdge[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!
    const debtor = debtors[di]!
    const amount = roundMoney(Math.min(creditor.remaining, debtor.remaining))

    if (amount > 0.01) {
      debts.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        amount,
      })
    }

    creditor.remaining = roundMoney(creditor.remaining - amount)
    debtor.remaining = roundMoney(debtor.remaining - amount)
    if (creditor.remaining <= 0.01) ci += 1
    if (debtor.remaining <= 0.01) di += 1
  }

  return debts
}

/** Loads a group the user is allowed to see, or throws 404/403. */
export async function findGroupForUser(groupId: string, userId: Types.ObjectId) {
  if (!Types.ObjectId.isValid(groupId)) throw ApiError.notFound('Group not found.')

  const group = await Group.findById(groupId)
  if (!group) throw ApiError.notFound('Group not found.')

  const isOwner = String(group.createdBy) === String(userId)
  const isMember = group.members.some((m) => m.userId && String(m.userId) === String(userId))
  if (!isOwner && !isMember) {
    throw ApiError.forbidden('You are not a member of this group.')
  }
  return group
}

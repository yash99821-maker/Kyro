import { Types } from 'mongoose'
import type { Request, Response } from 'express'
import { currentUser } from '../middleware/auth.js'
import { Expense } from '../models/Expense.js'
import { Group } from '../models/Group.js'
import { Settlement } from '../models/Settlement.js'
import { User } from '../models/User.js'
import {
  assertCustomSplitBalances,
  assertMembersExist,
  computeGroupBalances,
  findGroupForUser,
  splitEqually,
} from '../services/groupService.js'
import { createNotification } from '../services/notificationService.js'
import { ApiError } from '../utils/ApiError.js'
import { formatInr, roundMoney } from '../utils/money.js'

/**
 * POST /api/groups
 * The creator is always added as the first member, labelled "You" in the UI.
 */
export async function createGroup(req: Request, res: Response) {
  const user = currentUser(req)
  const { name, description, emoji, members } = req.body as {
    name: string
    description: string
    emoji: string
    members: Array<{ name: string; mobileNumber: string }>
  }

  const group = await Group.create({
    name,
    description,
    emoji,
    createdBy: user._id,
    members: [
      { userId: user._id, name: user.name, mobileNumber: user.mobileNumber },
      ...(await linkMembers(members)),
    ],
  })

  res.status(201).json({ success: true, message: 'Group created', data: { group: group.toJSON() } })
}

/** Attaches a userId to any member whose mobile number matches a KYRO account. */
async function linkMembers(members: Array<{ name: string; mobileNumber?: string }>) {
  const numbers = members.map((m) => m.mobileNumber).filter(Boolean) as string[]
  const matches = numbers.length
    ? await User.find({ mobileNumber: { $in: numbers } }).select('mobileNumber').lean()
    : []
  const byNumber = new Map(matches.map((m) => [m.mobileNumber, m._id]))

  return members.map((m) => ({
    name: m.name,
    mobileNumber: m.mobileNumber ?? '',
    userId: m.mobileNumber ? (byNumber.get(m.mobileNumber) ?? null) : null,
  }))
}

/** GET /api/groups — every group the user belongs to, with their net position. */
export async function listGroups(req: Request, res: Response) {
  const user = currentUser(req)

  const groups = await Group.find({
    $or: [{ createdBy: user._id }, { 'members.userId': user._id }],
  }).sort({ updatedAt: -1 })

  const data = await Promise.all(
    groups.map(async (group) => {
      const balances = await computeGroupBalances(group, user._id)
      return {
        ...group.toJSON(),
        memberCount: group.members.length,
        totalExpenses: balances.totalExpenses,
        yourNet: balances.yourNet,
      }
    }),
  )

  res.json({ success: true, data })
}

/** GET /api/groups/:id — members, expenses, settlements and computed balances. */
export async function getGroup(req: Request, res: Response) {
  const user = currentUser(req)
  const group = await findGroupForUser(req.params.id, user._id)

  const [expenses, settlements, balances] = await Promise.all([
    Expense.find({ groupId: group._id }).sort({ createdAt: -1 }),
    Settlement.find({ groupId: group._id }).sort({ createdAt: -1 }),
    computeGroupBalances(group, user._id),
  ])

  res.json({
    success: true,
    data: {
      group: group.toJSON(),
      expenses: expenses.map((e) => e.toJSON()),
      settlements: settlements.map((s) => s.toJSON()),
      balances,
    },
  })
}

/** POST /api/groups/:id/members */
export async function addMember(req: Request, res: Response) {
  const user = currentUser(req)
  const group = await findGroupForUser(req.params.id, user._id)
  const { name, mobileNumber } = req.body as { name: string; mobileNumber: string }

  if (group.members.length >= 20) {
    throw ApiError.badRequest('A group can have at most 20 members.')
  }
  if (group.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    throw ApiError.conflict(`${name} is already in this group.`)
  }

  const [linked] = await linkMembers([{ name, mobileNumber }])
  group.members.push(linked as never)
  await group.save()

  res.status(201).json({ success: true, message: `${name} added`, data: { group: group.toJSON() } })
}

/** DELETE /api/groups/:id/members/:memberId */
export async function removeMember(req: Request, res: Response) {
  const user = currentUser(req)
  const group = await findGroupForUser(req.params.id, user._id)
  const { memberId } = req.params

  const member = group.members.id(memberId)
  if (!member) throw ApiError.notFound('That member is not in this group.')

  // Removing someone who appears in an expense would corrupt the balances.
  const involved = await Expense.countDocuments({
    groupId: group._id,
    $or: [{ paidBy: memberId }, { 'participants.memberId': memberId }],
  })
  if (involved > 0) {
    throw ApiError.badRequest(
      `${member.name} is part of existing expenses and cannot be removed.`,
    )
  }

  group.members.pull({ _id: memberId })
  await group.save()

  res.json({ success: true, message: 'Member removed', data: { group: group.toJSON() } })
}

/**
 * POST /api/groups/:id/expenses
 *
 * EQUAL  -> the server divides the amount across the selected participants.
 * CUSTOM -> the client supplies each share and the server verifies they add
 *           up to the expense total before writing anything.
 */
export async function addExpense(req: Request, res: Response) {
  const user = currentUser(req)
  const group = await findGroupForUser(req.params.id, user._id)

  const { description, amount, paidBy, splitType, participants } = req.body as {
    description: string
    amount: number
    paidBy: string
    splitType: 'EQUAL' | 'CUSTOM'
    participants: Array<{ memberId: string; share?: number }>
  }

  assertMembersExist(group, [paidBy, ...participants.map((p) => p.memberId)])

  const uniqueIds = new Set(participants.map((p) => p.memberId))
  if (uniqueIds.size !== participants.length) {
    throw ApiError.badRequest('The same person is listed twice in this split.')
  }

  let resolved: Array<{ memberId: Types.ObjectId; share: number }>

  if (splitType === 'EQUAL') {
    const shares = splitEqually(amount, participants.length)
    resolved = participants.map((p, i) => ({
      memberId: new Types.ObjectId(p.memberId),
      share: shares[i] ?? 0,
    }))
  } else {
    const withShares = participants.map((p) => ({ ...p, share: p.share ?? 0 }))
    assertCustomSplitBalances(amount, withShares)
    resolved = withShares.map((p) => ({
      memberId: new Types.ObjectId(p.memberId),
      share: roundMoney(p.share),
    }))
  }

  const expense = await Expense.create({
    groupId: group._id,
    description,
    amount: roundMoney(amount),
    paidBy: new Types.ObjectId(paidBy),
    splitType,
    participants: resolved,
    createdBy: user._id,
  })

  // Touch the group so it sorts to the top of the list.
  group.set('updatedAt', new Date())
  await group.save()

  const balances = await computeGroupBalances(group, user._id)

  await createNotification(
    user._id,
    'GROUP',
    `Expense added in ${group.name}`,
    `${description} — ${formatInr(amount)} split between ${resolved.length} people.`,
    `/groups/${group._id}`,
  )

  res.status(201).json({
    success: true,
    message: 'Expense added',
    data: { expense: expense.toJSON(), balances },
  })
}

/** DELETE /api/groups/:id/expenses/:expenseId */
export async function deleteExpense(req: Request, res: Response) {
  const user = currentUser(req)
  const group = await findGroupForUser(req.params.id, user._id)

  const expense = await Expense.findOneAndDelete({
    _id: req.params.expenseId,
    groupId: group._id,
  })
  if (!expense) throw ApiError.notFound('Expense not found.')

  const balances = await computeGroupBalances(group, user._id)
  res.json({ success: true, message: 'Expense deleted', data: { balances } })
}

/** GET /api/groups/:id/balances */
export async function getBalances(req: Request, res: Response) {
  const user = currentUser(req)
  const group = await findGroupForUser(req.params.id, user._id)
  const balances = await computeGroupBalances(group, user._id)
  res.json({ success: true, data: balances })
}

/**
 * POST /api/groups/:id/settle
 *
 * Records a repayment between two members. The settlement is validated
 * against the currently outstanding debt so a member cannot settle more than
 * they actually owe.
 */
export async function settleUp(req: Request, res: Response) {
  const user = currentUser(req)
  const group = await findGroupForUser(req.params.id, user._id)

  const { fromMemberId, toMemberId, amount, note } = req.body as {
    fromMemberId: string
    toMemberId: string
    amount: number
    note: string
  }

  assertMembersExist(group, [fromMemberId, toMemberId])
  if (fromMemberId === toMemberId) {
    throw ApiError.badRequest('A member cannot settle up with themselves.')
  }

  const before = await computeGroupBalances(group, user._id)
  const outstanding = before.debts.find(
    (d) => d.fromMemberId === fromMemberId && d.toMemberId === toMemberId,
  )
  if (!outstanding) {
    throw ApiError.badRequest('There is nothing outstanding between those two members.')
  }
  if (roundMoney(amount) > outstanding.amount + 0.01) {
    throw ApiError.badRequest(
      `That is more than the ${formatInr(outstanding.amount)} outstanding.`,
    )
  }

  const settlement = await Settlement.create({
    groupId: group._id,
    fromMemberId: new Types.ObjectId(fromMemberId),
    toMemberId: new Types.ObjectId(toMemberId),
    amount: roundMoney(amount),
    status: 'COMPLETED',
    note,
    recordedBy: user._id,
    settledAt: new Date(),
  })

  const balances = await computeGroupBalances(group, user._id)

  await createNotification(
    user._id,
    'GROUP',
    'Settlement recorded',
    `${outstanding.fromName} settled ${formatInr(amount)} with ${outstanding.toName} in ${group.name}.`,
    `/groups/${group._id}`,
  )

  res.status(201).json({
    success: true,
    message: 'Settlement recorded',
    data: { settlement: settlement.toJSON(), balances },
  })
}

/** DELETE /api/groups/:id — only the creator can delete a group. */
export async function deleteGroup(req: Request, res: Response) {
  const user = currentUser(req)
  const group = await findGroupForUser(req.params.id, user._id)

  if (String(group.createdBy) !== String(user._id)) {
    throw ApiError.forbidden('Only the person who created this group can delete it.')
  }

  await Promise.all([
    Expense.deleteMany({ groupId: group._id }),
    Settlement.deleteMany({ groupId: group._id }),
    group.deleteOne(),
  ])

  res.json({ success: true, message: 'Group deleted' })
}

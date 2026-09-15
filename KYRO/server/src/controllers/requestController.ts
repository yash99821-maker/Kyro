import { Types } from 'mongoose'
import type { Request, Response } from 'express'
import { currentUser } from '../middleware/auth.js'
import { MoneyRequest } from '../models/MoneyRequest.js'
import { User } from '../models/User.js'
import { createNotification } from '../services/notificationService.js'
import { ApiError } from '../utils/ApiError.js'
import { formatInr } from '../utils/money.js'

/** POST /api/requests — ask someone for money. */
export async function createRequest(req: Request, res: Response) {
  const user = currentUser(req)
  const { payeeName, payeeUpiId, amount, note } = req.body as {
    payeeName: string
    payeeUpiId: string
    amount: number
    note: string
  }

  const payee = payeeUpiId ? await User.findOne({ upiId: payeeUpiId.toLowerCase() }) : null

  const request = await MoneyRequest.create({
    requesterId: user._id,
    payeeName,
    payeeUpiId,
    payeeUserId: payee?._id ?? null,
    amount,
    note,
    status: 'PENDING',
  })

  await createNotification(
    user._id,
    'REQUEST',
    'Request sent',
    `You requested ${formatInr(amount)} from ${payeeName}.`,
    '/request',
  )

  // Notify the other side too, when they are a KYRO account.
  if (payee && String(payee._id) !== String(user._id)) {
    await createNotification(
      payee._id,
      'REQUEST',
      'Money requested',
      `${user.name} requested ${formatInr(amount)} from you.`,
      '/request',
    )
  }

  res.status(201).json({
    success: true,
    message: 'Request sent',
    data: { request: request.toJSON() },
  })
}

/** GET /api/requests — requests you sent and requests sent to you. */
export async function listRequests(req: Request, res: Response) {
  const user = currentUser(req)

  const [sent, received] = await Promise.all([
    MoneyRequest.find({ requesterId: user._id }).sort({ createdAt: -1 }).limit(50),
    MoneyRequest.find({ payeeUserId: user._id }).sort({ createdAt: -1 }).limit(50),
  ])

  res.json({
    success: true,
    data: {
      sent: sent.map((r) => r.toJSON()),
      received: received.map((r) => r.toJSON()),
    },
  })
}

/**
 * PUT /api/requests/:id/status
 * The person who was asked accepts or rejects. Accepting only marks the
 * request — the actual payment still goes through the normal Send Money flow
 * with PIN verification.
 */
export async function updateRequestStatus(req: Request, res: Response) {
  const user = currentUser(req)
  const { id } = req.params
  const { status } = req.body as { status: 'ACCEPTED' | 'REJECTED' }

  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Request not found.')

  const request = await MoneyRequest.findById(id)
  if (!request) throw ApiError.notFound('Request not found.')

  const isPayee = request.payeeUserId && String(request.payeeUserId) === String(user._id)
  if (!isPayee) {
    throw ApiError.forbidden('Only the person who was asked can respond to this request.')
  }
  if (request.status !== 'PENDING') {
    throw ApiError.badRequest('This request has already been answered.')
  }

  request.status = status
  await request.save()

  await createNotification(
    request.requesterId,
    'REQUEST',
    status === 'ACCEPTED' ? 'Request accepted' : 'Request declined',
    `${user.name} ${status === 'ACCEPTED' ? 'accepted' : 'declined'} your ${formatInr(request.amount)} request.`,
    '/request',
  )

  res.json({ success: true, data: { request: request.toJSON() } })
}

/** DELETE /api/requests/:id — cancel a request you sent. */
export async function cancelRequest(req: Request, res: Response) {
  const user = currentUser(req)
  const request = await MoneyRequest.findOneAndDelete({
    _id: req.params.id,
    requesterId: user._id,
  })
  if (!request) throw ApiError.notFound('Request not found.')
  res.json({ success: true, message: 'Request cancelled' })
}

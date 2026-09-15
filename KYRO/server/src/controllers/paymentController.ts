import type { Request, Response } from 'express'
import { currentUser } from '../middleware/auth.js'
import { User } from '../models/User.js'
import {
  assertNoDuplicateSubmission,
  processDebitPayment,
} from '../services/paymentService.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Shapes the API response for a completed payment. The client renders the
 * success screen purely from these server-computed values.
 */
function paymentResponse(
  result: Awaited<ReturnType<typeof processDebitPayment>>,
  res: Response,
  message: string,
) {
  res.status(201).json({
    success: true,
    message,
    data: {
      transaction: result.transaction.toJSON(),
      savedAmount: result.savedAmount,
      balance: result.balance,
      savingsBalance: result.savingsBalance,
    },
  })
}

/** POST /api/payments/send — person-to-person transfer. */
export async function sendMoney(req: Request, res: Response) {
  const user = currentUser(req)
  const { receiverName, receiverUpiId, amount, note, category, pin } = req.body

  await assertNoDuplicateSubmission(user._id, amount, receiverName)

  const result = await processDebitPayment({
    user,
    amount,
    pin,
    type: 'PAYMENT',
    category,
    receiverName,
    receiverUpiId,
    description: note,
  })

  paymentResponse(result, res, 'Payment successful')
}

/**
 * POST /api/payments/scan — pay a scanned KYRO QR code.
 *
 * DEMO SCOPE: the QR encodes a KYRO UPI handle (`kyro://pay?pa=...&pn=...`)
 * or a plain KYRO handle. It is not connected to real UPI infrastructure.
 */
export async function scanPay(req: Request, res: Response) {
  const user = currentUser(req)
  const { qrPayload, amount, note, category, pin } = req.body as {
    qrPayload: string
    amount: number
    note: string
    category: string
    pin: string
  }

  const target = await resolveQrPayload(qrPayload)

  await assertNoDuplicateSubmission(user._id, amount, target.name)

  const result = await processDebitPayment({
    user,
    amount,
    pin,
    type: 'PAYMENT',
    category,
    receiverName: target.name,
    receiverUpiId: target.upiId,
    description: note,
    meta: { source: 'scan' },
  })

  paymentResponse(result, res, 'Payment successful')
}

/**
 * GET /api/payments/resolve-qr?payload=...
 * Looks up who a scanned code belongs to, before an amount is entered.
 */
export async function resolveQr(req: Request, res: Response) {
  const payload = String(req.query.payload ?? '')
  const target = await resolveQrPayload(payload)
  res.json({ success: true, data: target })
}

/** Parses a KYRO QR payload and resolves it to a payable party. */
async function resolveQrPayload(payload: string) {
  const trimmed = payload.trim()
  if (!trimmed) throw ApiError.badRequest('That QR code could not be read.')

  let upiId = ''
  let name = ''

  if (trimmed.includes('?')) {
    // kyro://pay?pa=<upi>&pn=<name>
    const query = trimmed.slice(trimmed.indexOf('?') + 1)
    const params = new URLSearchParams(query)
    upiId = (params.get('pa') ?? '').toLowerCase()
    name = params.get('pn') ?? ''
  } else if (trimmed.includes('@')) {
    upiId = trimmed.toLowerCase()
  }

  if (!upiId) {
    throw ApiError.badRequest('That is not a valid KYRO QR code.')
  }

  const match = await User.findOne({ upiId }).select('name upiId').lean()
  if (match) {
    return { name: match.name, upiId: match.upiId, verified: true, isKyroUser: true }
  }

  if (!name) {
    throw ApiError.badRequest('This QR code does not belong to a KYRO account.')
  }

  // A merchant QR that is not itself a KYRO account — still payable in the demo.
  return { name, upiId, verified: false, isKyroUser: false }
}

/** POST /api/payments/recharge — simulated mobile recharge. */
export async function recharge(req: Request, res: Response) {
  const user = currentUser(req)
  const { mobileNumber, operator, amount, pin } = req.body as {
    mobileNumber: string
    operator: string
    amount: number
    pin: string
  }

  const receiverName = `${operator} · ${mobileNumber}`
  await assertNoDuplicateSubmission(user._id, amount, receiverName)

  const result = await processDebitPayment({
    user,
    amount,
    pin,
    type: 'RECHARGE',
    category: 'recharge',
    receiverName,
    description: `Mobile recharge for ${mobileNumber}`,
    meta: { operator, mobileNumber, simulated: true },
  })

  paymentResponse(result, res, 'Recharge successful')
}

/** POST /api/payments/bill — simulated utility / bill payment. */
export async function payBill(req: Request, res: Response) {
  const user = currentUser(req)
  const { billType, provider, consumerNumber, amount, pin } = req.body as {
    billType: string
    provider: string
    consumerNumber: string
    amount: number
    pin: string
  }

  await assertNoDuplicateSubmission(user._id, amount, provider)

  const result = await processDebitPayment({
    user,
    amount,
    pin,
    type: 'BILL',
    category: 'bills',
    receiverName: provider,
    description: `${billType} bill · ${consumerNumber}`,
    meta: { billType, provider, consumerNumber, simulated: true },
  })

  paymentResponse(result, res, 'Bill paid successfully')
}

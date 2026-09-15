import mongoose from 'mongoose'
import { Transaction, type TransactionType } from '../models/Transaction.js'
import { User, type IUser } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { generateReferenceId } from '../utils/reference.js'
import { formatInr, roundMoney } from '../utils/money.js'
import { applyRoundUp } from './savingsService.js'
import { createNotifications } from './notificationService.js'

/**
 * ============================================================
 * PAYMENT ENGINE
 * ============================================================
 *
 * DEMO SCOPE: this simulates a payment inside KYRO's own database. No bank,
 * UPI switch or payment gateway is contacted and no real money moves. What IS
 * real is everything around it — PIN verification, balance arithmetic,
 * round-up savings and the stored transaction record.
 *
 * Every debit follows the same ordered steps so the rules stay consistent
 * across Send Money, Scan & Pay, Recharge and Bill payments:
 *
 *   1. verify the transaction PIN against the bcrypt hash
 *   2. re-read the amount from the request but re-validate it server-side
 *   3. check sufficient balance (never allow a negative balance)
 *   4. debit the payer
 *   5. credit the receiver, if the receiver is also a KYRO user
 *   6. run the Kyro Save round-up
 *   7. write the Transaction document and notifications
 *
 * The client never sends a balance or a savings figure — it only sends the
 * amount, the receiver and the PIN.
 */

export interface DebitPaymentInput {
  user: IUser
  amount: number
  pin: string
  type: Extract<TransactionType, 'PAYMENT' | 'RECHARGE' | 'BILL' | 'GROUP'>
  category: string
  receiverName: string
  receiverUpiId?: string
  description?: string
  meta?: Record<string, unknown>
}

export interface PaymentResult {
  transaction: Awaited<ReturnType<typeof Transaction.create>> extends Array<infer T> ? T : never
  savedAmount: number
  balance: number
  savingsBalance: number
}

async function verifyPin(user: IUser, pin: string): Promise<void> {
  // transactionPinHash has `select: false`, so re-fetch it explicitly.
  const withPin = await User.findById(user._id).select('+transactionPinHash')
  if (!withPin) throw ApiError.unauthorized('Account not found.')

  const valid = await withPin.verifyTransactionPin(pin)
  if (!valid) throw ApiError.badRequest('Incorrect transaction PIN. Please try again.')
}

/**
 * Runs a simulated outgoing payment end to end and returns the stored record.
 */
export async function processDebitPayment(input: DebitPaymentInput) {
  const { user, pin, type, category, receiverName, receiverUpiId = '', meta = {} } = input
  const amount = roundMoney(input.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw ApiError.badRequest('Please enter a valid amount.')
  }
  if (amount > 100000) {
    throw ApiError.badRequest('Demo limit: a single payment cannot exceed ₹1,00,000.')
  }

  await verifyPin(user, pin)

  if (user.balance < amount) {
    throw ApiError.badRequest(
      `Insufficient balance. You have ${formatInr(user.balance)} available.`,
    )
  }

  const description = input.description?.trim() ?? ''
  const referenceId = generateReferenceId()

  // Debit the payer.
  user.balance = roundMoney(user.balance - amount)

  // Credit the counterparty when they are a real KYRO account.
  const receiver = receiverUpiId
    ? await User.findOne({ upiId: receiverUpiId.toLowerCase() })
    : null

  const [transaction] = await Transaction.create([
    {
      userId: user._id,
      type,
      amount,
      category,
      sender: { name: user.name, upiId: user.upiId, userId: user._id },
      receiver: {
        name: receiverName,
        upiId: receiverUpiId,
        ...(receiver ? { userId: receiver._id } : {}),
      },
      status: 'SUCCESS',
      description,
      referenceId,
      roundUpAmount: 0,
      meta,
    },
  ])

  // Kyro Save round-up runs after the payment itself succeeds.
  const roundUp = await applyRoundUp(
    user,
    amount,
    transaction._id,
    description || `Payment to ${receiverName}`,
  )

  if (roundUp.applied) {
    transaction.roundUpAmount = roundUp.savedAmount
    await transaction.save()
  }

  await user.save()

  // Mirror the payment on the receiver's side so both users see it.
  if (receiver && String(receiver._id) !== String(user._id)) {
    receiver.balance = roundMoney(receiver.balance + amount)
    await receiver.save()
    await Transaction.create({
      userId: receiver._id,
      type: 'RECEIVED',
      amount,
      category: 'transfer',
      sender: { name: user.name, upiId: user.upiId, userId: user._id },
      receiver: { name: receiver.name, upiId: receiver.upiId, userId: receiver._id },
      status: 'SUCCESS',
      description,
      referenceId: generateReferenceId('KYRORCV'),
      roundUpAmount: 0,
      meta: { linkedReference: referenceId },
    })
    await createNotifications(receiver._id, [
      {
        type: 'RECEIVED',
        title: 'Money received',
        message: `${formatInr(amount)} received from ${user.name}.`,
        link: '/transactions',
      },
    ])
  }

  const notifications: Parameters<typeof createNotifications>[1] = [
    {
      type: 'PAYMENT',
      title: 'Payment successful',
      message: `${formatInr(amount)} paid to ${receiverName}.`,
      link: `/transactions/${transaction._id}`,
    },
  ]
  if (roundUp.applied) {
    notifications.push({
      type: 'SAVING',
      title: 'Kyro Save',
      message: `${formatInr(roundUp.savedAmount)} added to your savings pot.`,
      link: '/save',
    })
  }
  await createNotifications(user._id, notifications)

  return {
    transaction,
    savedAmount: roundUp.savedAmount,
    balance: user.balance,
    savingsBalance: user.savingsBalance,
  }
}

/** Guards against a duplicate submission caused by a double-clicked button. */
export async function assertNoDuplicateSubmission(
  userId: mongoose.Types.ObjectId,
  amount: number,
  receiverName: string,
) {
  const tenSecondsAgo = new Date(Date.now() - 10_000)
  const duplicate = await Transaction.findOne({
    userId,
    amount: roundMoney(amount),
    'receiver.name': receiverName,
    status: 'SUCCESS',
    createdAt: { $gte: tenSecondsAgo },
  })
  if (duplicate) {
    throw ApiError.conflict(
      'That looks like a duplicate payment — it was already processed a moment ago.',
    )
  }
}

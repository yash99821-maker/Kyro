import bcrypt from 'bcryptjs'
import type { Request, Response } from 'express'
import { DEMO_OTP, DEFAULT_DEMO_PIN } from '../config/constants.js'
import { OtpToken } from '../models/OtpToken.js'
import { IUser, User } from '../models/User.js'
import { currentUser, signAuthToken } from '../middleware/auth.js'
import { ApiError } from '../utils/ApiError.js'
import { buildUpiId } from '../utils/reference.js'
import { createNotification } from '../services/notificationService.js'

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5

export async function requestOtp(req: Request, res: Response) {
  const { mobileNumber } = req.body as { mobileNumber: string }

  const existing = await User.findOne({ mobileNumber })

  await OtpToken.deleteMany({ mobileNumber })
  await OtpToken.create({
    mobileNumber,
    codeHash: await bcrypt.hash(DEMO_OTP, 10),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  })

  res.json({
    success: true,
    message: `Verification code sent to +91 ${mobileNumber}`,
    data: {
      mobileNumber,
      isExistingUser: Boolean(existing),
      name: existing?.name ?? null,
      demoMode: true,
    },
  })
}

export async function verifyOtp(req: Request, res: Response) {
  const { mobileNumber, otp, name } = req.body as {
    mobileNumber: string
    otp: string
    name?: string
  }

  const challenge = await OtpToken.findOne({ mobileNumber }).sort({ createdAt: -1 })
  if (!challenge) {
    const existingUser = otp === DEMO_OTP ? await User.findOne({ mobileNumber }) : null
    if (!existingUser) {
      throw ApiError.badRequest('That code has expired. Please request a new one.')
    }
    const token = signAuthToken(String(existingUser._id))
    res.json({
      success: true,
      message: 'Signed in',
      data: { token, user: existingUser.toJSON(), isNewUser: false },
    })
    return
  }
  if (challenge.expiresAt.getTime() < Date.now()) {
    await challenge.deleteOne()
    throw ApiError.badRequest('That code has expired. Please request a new one.')
  }
  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    await challenge.deleteOne()
    throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.')
  }

  const valid = await bcrypt.compare(otp, challenge.codeHash)
  if (!valid) {
    challenge.attempts += 1
    await challenge.save()
    throw ApiError.badRequest('That verification code is incorrect.')
  }

  // Account creation uses an atomic upsert keyed on mobileNumber instead of
  // "find, then insert if missing" — that pattern was inherently racy: two
  // near-simultaneous requests could both see "no user yet" and both try to
  // insert, and the loser crashed with a duplicate-key error. An upsert lets
  // MongoDB itself guarantee only one document is ever created.
  const wasExistingUser = Boolean(await User.exists({ mobileNumber }))
  const displayName = name?.trim() || `KYRO User ${mobileNumber.slice(-4)}`
  const pinHash = wasExistingUser ? undefined : await bcrypt.hash(DEFAULT_DEMO_PIN, 10)

  let user: IUser
  try {
    user = (await User.findOneAndUpdate(
      { mobileNumber },
      {
        $setOnInsert: {
          name: displayName,
          mobileNumber,
          upiId: buildUpiId(displayName, mobileNumber),
          balance: 25450,
          savingsBalance: 0,
          kyroSave: { enabled: true, roundUpTo: 10, goalName: 'Laptop Goal', goalAmount: 60000 },
          transactionPinHash: pinHash,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ))!
  } catch (error) {
    const isDuplicateKey =
      typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000
    if (!isDuplicateKey) throw error
    const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern
    if (keyPattern && 'upiId' in keyPattern) {
      user = (await User.findOneAndUpdate(
        { mobileNumber },
        {
          $setOnInsert: {
            name: displayName,
            mobileNumber,
            upiId: `${buildUpiId(displayName, mobileNumber).replace('@kyro', '')}.${mobileNumber.slice(0, 4)}@kyro`,
            balance: 25450,
            savingsBalance: 0,
            kyroSave: { enabled: true, roundUpTo: 10, goalName: 'Laptop Goal', goalAmount: 60000 },
            transactionPinHash: pinHash,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ))!
    } else {
      const existing = await User.findOne({ mobileNumber })
      if (!existing) throw error
      user = existing
    }
  }

  const isNewUser = !wasExistingUser

  if (isNewUser) {
    await createNotification(
      user._id,
      'SYSTEM',
      'Welcome to KYRO',
      'Your account is ready. Every payment you make now rounds up into Kyro Save.',
      '/save',
    )
  }

  await challenge.deleteOne()

  const token = signAuthToken(String(user._id))
  res.json({
    success: true,
    message: isNewUser ? 'Account created' : 'Signed in',
    data: { token, user: user.toJSON(), isNewUser },
  })
}

export async function me(req: Request, res: Response) {
  const user = currentUser(req)
  res.json({ success: true, data: { user: user.toJSON() } })
}

export async function logout(_req: Request, res: Response) {
  res.json({ success: true, message: 'Signed out' })
}
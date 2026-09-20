import bcrypt from 'bcryptjs'
import type { Request, Response } from 'express'
import { DEMO_OTP, DEFAULT_DEMO_PIN } from '../config/constants.js'
import { OtpToken } from '../models/OtpToken.js'
import { User } from '../models/User.js'
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

  let user = await User.findOne({ mobileNumber })
  let isNewUser = false

  if (!user) {
    const displayName = name?.trim() || `KYRO User ${mobileNumber.slice(-4)}`
    try {
      user = new User({
        name: displayName,
        mobileNumber,
        upiId: buildUpiId(displayName, mobileNumber),
        balance: 25450,
        savingsBalance: 0,
        kyroSave: { enabled: true, roundUpTo: 10, goalName: 'Laptop Goal', goalAmount: 60000 },
      })
      await user.setTransactionPin(DEFAULT_DEMO_PIN)
      await user.save()
      isNewUser = true

      await createNotification(
        user._id,
        'SYSTEM',
        'Welcome to KYRO',
        'Your account is ready. Every payment you make now rounds up into Kyro Save.',
        '/save',
      )
    } catch (error) {
      const isDuplicateKey =
        typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000
      if (!isDuplicateKey) throw error

      const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern
      const duplicateField = keyPattern ? Object.keys(keyPattern)[0] : undefined

      if (duplicateField === 'upiId') {
        user!.upiId = `${user!.upiId.replace('@kyro', '')}.${mobileNumber.slice(0, 4)}@kyro`
        await user!.save()
        isNewUser = true
        await createNotification(
          user!._id,
          'SYSTEM',
          'Welcome to KYRO',
          'Your account is ready. Every payment you make now rounds up into Kyro Save.',
          '/save',
        )
      } else {
        const existing = await User.findOne({ mobileNumber })
        if (!existing) throw error
        user = existing
        isNewUser = false
      }
    }
  }

  await challenge.deleteOne()

  if (!user) throw new ApiError(500, 'Could not create or find the user account.')

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
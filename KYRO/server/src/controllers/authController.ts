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

/**
 * POST /api/auth/login
 *
 * Issues an OTP challenge for a mobile number.
 *
 * DEMO SCOPE: no SMS provider is contacted. The code is always the fixed
 * DEMO_OTP, but it is still hashed, stored with a 5-minute expiry, and
 * verified server-side — the client can never bypass the check.
 */
export async function requestOtp(req: Request, res: Response) {
  const { mobileNumber } = req.body as { mobileNumber: string }

  const existing = await User.findOne({ mobileNumber })

  // Replace any previous challenge for this number.
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
      // Surfaced only so the demo can be run without an SMS gateway.
      demoMode: true,
    },
  })
}

/**
 * POST /api/auth/verify-otp
 *
 * Verifies the challenge and returns a JWT. Creates the account on first
 * successful verification (passwordless sign-up, as in most payment apps).
 */
export async function verifyOtp(req: Request, res: Response) {
  const { mobileNumber, otp, name } = req.body as {
    mobileNumber: string
    otp: string
    name?: string
  }

  const challenge = await OtpToken.findOne({ mobileNumber }).sort({ createdAt: -1 })
  if (!challenge) {
    throw ApiError.badRequest('That code has expired. Please request a new one.')
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

  await challenge.deleteOne()

  let user = await User.findOne({ mobileNumber })
  let isNewUser = false

  if (!user) {
    const displayName = name?.trim() || `KYRO User ${mobileNumber.slice(-4)}`
    user = new User({
      name: displayName,
      mobileNumber,
      upiId: buildUpiId(displayName, mobileNumber),
      balance: 25450, // demo opening balance
      savingsBalance: 0,
      kyroSave: { enabled: true, roundUpTo: 10, goalName: 'Laptop Goal', goalAmount: 60000 },
    })
    // Demo accounts start with a known PIN so the flow can be demonstrated.
    // It is stored as a bcrypt hash, never in plain text.
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
  }

  const token = signAuthToken(String(user._id))
  res.json({
    success: true,
    message: isNewUser ? 'Account created' : 'Signed in',
    data: { token, user: user.toJSON(), isNewUser },
  })
}

/** GET /api/auth/me — returns the signed-in user. */
export async function me(req: Request, res: Response) {
  const user = currentUser(req)
  res.json({ success: true, data: { user: user.toJSON() } })
}

/**
 * POST /api/auth/logout
 *
 * JWTs are stateless, so the server has nothing to revoke here; the client
 * discards the token. The endpoint exists so logout is an explicit,
 * auditable action rather than a silent client-side delete.
 */
export async function logout(_req: Request, res: Response) {
  res.json({ success: true, message: 'Signed out' })
}

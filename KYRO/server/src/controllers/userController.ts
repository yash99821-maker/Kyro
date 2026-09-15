import type { Request, Response } from 'express'
import { currentUser } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'

/** GET /api/users/me */
export async function getProfile(req: Request, res: Response) {
  const user = currentUser(req)
  res.json({ success: true, data: { user: user.toJSON() } })
}

/** PUT /api/users/me — updates the editable profile fields. */
export async function updateProfile(req: Request, res: Response) {
  const user = currentUser(req)
  const { name, email, profileImage } = req.body as {
    name?: string
    email?: string
    profileImage?: string
  }

  if (name !== undefined) user.name = name
  if (email !== undefined) user.email = email
  if (profileImage !== undefined) user.profileImage = profileImage

  await user.save()
  res.json({ success: true, message: 'Profile updated', data: { user: user.toJSON() } })
}

/** PUT /api/users/me/pin — rotates the transaction PIN (hashed, never stored raw). */
export async function changePin(req: Request, res: Response) {
  const user = currentUser(req)
  const { currentPin, newPin } = req.body as { currentPin: string; newPin: string }

  const withPin = await User.findById(user._id).select('+transactionPinHash')
  if (!withPin) throw ApiError.notFound('Account not found.')

  const valid = await withPin.verifyTransactionPin(currentPin)
  if (!valid) throw ApiError.badRequest('Your current PIN is incorrect.')

  if (currentPin === newPin) {
    throw ApiError.badRequest('Choose a PIN different from your current one.')
  }

  await withPin.setTransactionPin(newPin)
  await withPin.save()

  res.json({ success: true, message: 'Transaction PIN updated' })
}

/**
 * GET /api/users/directory
 *
 * The people you can pay: every other KYRO account. Returns only public
 * fields — no balances, no PIN data.
 */
export async function getDirectory(req: Request, res: Response) {
  const user = currentUser(req)
  const users = await User.find({ _id: { $ne: user._id } })
    .select('name upiId mobileNumber profileImage')
    .sort({ name: 1 })
    .limit(50)
    .lean()

  res.json({
    success: true,
    data: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      upiId: u.upiId,
      mobileNumber: u.mobileNumber,
      profileImage: u.profileImage ?? '',
    })),
  })
}

/** GET /api/users/lookup?upiId=... — resolves a UPI handle before paying. */
export async function lookupUpi(req: Request, res: Response) {
  const upiId = String(req.query.upiId ?? '')
    .trim()
    .toLowerCase()
  if (!upiId) throw ApiError.badRequest('Enter a UPI ID to search for.')

  const match = await User.findOne({ upiId }).select('name upiId').lean()
  if (!match) {
    res.json({ success: true, data: { found: false } })
    return
  }

  res.json({
    success: true,
    data: { found: true, name: match.name, upiId: match.upiId, verified: true },
  })
}

import { Types } from 'mongoose'
import type { Request, Response } from 'express'
import { currentUser } from '../middleware/auth.js'
import { Notification } from '../models/Notification.js'
import { ApiError } from '../utils/ApiError.js'

/** GET /api/notifications */
export async function listNotifications(req: Request, res: Response) {
  const user = currentUser(req)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 40)))

  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ userId: user._id, read: false }),
  ])

  res.json({
    success: true,
    data: { items: items.map((n) => n.toJSON()), unreadCount },
  })
}

/** PUT /api/notifications/:id/read */
export async function markRead(req: Request, res: Response) {
  const user = currentUser(req)
  const { id } = req.params

  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Notification not found.')

  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: user._id },
    { read: true },
    { new: true },
  )
  if (!notification) throw ApiError.notFound('Notification not found.')

  res.json({ success: true, data: { notification: notification.toJSON() } })
}

/** PUT /api/notifications/read-all */
export async function markAllRead(req: Request, res: Response) {
  const user = currentUser(req)
  await Notification.updateMany({ userId: user._id, read: false }, { read: true })
  res.json({ success: true, message: 'All notifications marked as read' })
}

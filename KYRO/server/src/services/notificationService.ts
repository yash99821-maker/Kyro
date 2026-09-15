import type { Types } from 'mongoose'
import { Notification, type NotificationType } from '../models/Notification.js'

export async function createNotification(
  userId: Types.ObjectId,
  type: NotificationType,
  title: string,
  message: string,
  link = '',
) {
  return Notification.create({ userId, type, title, message, link })
}

export async function createNotifications(
  userId: Types.ObjectId,
  entries: Array<{ type: NotificationType; title: string; message: string; link?: string }>,
) {
  if (entries.length === 0) return []
  return Notification.insertMany(
    entries.map((entry) => ({ ...entry, userId, link: entry.link ?? '' })),
  )
}

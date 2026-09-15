import mongoose, { Schema, Types, Document, Model } from 'mongoose'
import { applyJsonTransform } from './jsonTransform.js'

export const NOTIFICATION_TYPES = [
  'PAYMENT',
  'RECEIVED',
  'SAVING',
  'GROUP',
  'INSIGHT',
  'REQUEST',
  'SYSTEM',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface INotification extends Document<Types.ObjectId> {
  userId: Types.ObjectId
  type: NotificationType
  title: string
  message: string
  read: boolean
  link: string
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'SYSTEM' },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: '', trim: true },
    read: { type: Boolean, default: false },
    link: { type: String, default: '' },
  },
  { timestamps: true },
)

notificationSchema.index({ userId: 1, createdAt: -1 })

applyJsonTransform(notificationSchema)

export const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ??
  mongoose.model<INotification>('Notification', notificationSchema)

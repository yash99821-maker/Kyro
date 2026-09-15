import mongoose, { Schema, Types, Document, Model } from 'mongoose'
import { applyJsonTransform } from './jsonTransform.js'

export const REQUEST_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

/**
 * A "request money" record. `requester` asks `payee` for `amount`.
 * Kept separate from Transaction because a request is only a promise —
 * a Transaction is written when it is actually paid.
 */
export interface IMoneyRequest extends Document<Types.ObjectId> {
  requesterId: Types.ObjectId
  payeeName: string
  payeeUpiId: string
  payeeUserId: Types.ObjectId | null
  amount: number
  note: string
  status: RequestStatus
  createdAt: Date
  updatedAt: Date
}

const moneyRequestSchema = new Schema<IMoneyRequest>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    payeeName: { type: String, required: true, trim: true },
    payeeUpiId: { type: String, default: '', trim: true },
    payeeUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, default: '', trim: true },
    status: { type: String, enum: REQUEST_STATUSES, default: 'PENDING' },
  },
  { timestamps: true },
)

moneyRequestSchema.index({ requesterId: 1, createdAt: -1 })

applyJsonTransform(moneyRequestSchema)

export const MoneyRequest: Model<IMoneyRequest> =
  (mongoose.models.MoneyRequest as Model<IMoneyRequest>) ??
  mongoose.model<IMoneyRequest>('MoneyRequest', moneyRequestSchema)

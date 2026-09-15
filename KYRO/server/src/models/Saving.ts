import mongoose, { Schema, Types, Document, Model } from 'mongoose'
import { applyJsonTransform } from './jsonTransform.js'

/**
 * One Kyro Save round-up entry. Created every time a payment rounds up,
 * so the savings page can show a real, auditable history instead of a
 * single running total.
 */
export interface ISaving extends Document<Types.ObjectId> {
  userId: Types.ObjectId
  transactionId: Types.ObjectId | null
  originalAmount: number
  roundedAmount: number
  savedAmount: number
  roundUpType: 10 | 50
  label: string
  createdAt: Date
  updatedAt: Date
}

const savingSchema = new Schema<ISaving>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
    originalAmount: { type: Number, required: true, min: 0 },
    roundedAmount: { type: Number, required: true, min: 0 },
    savedAmount: { type: Number, required: true, min: 0 },
    roundUpType: { type: Number, enum: [10, 50], required: true },
    label: { type: String, default: '', trim: true },
  },
  { timestamps: true },
)

savingSchema.index({ userId: 1, createdAt: -1 })

applyJsonTransform(savingSchema)

export const Saving: Model<ISaving> =
  (mongoose.models.Saving as Model<ISaving>) ?? mongoose.model<ISaving>('Saving', savingSchema)

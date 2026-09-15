import mongoose, { Schema, Types, Document, Model } from 'mongoose'
import { applyJsonTransform } from './jsonTransform.js'

export const SETTLEMENT_STATUSES = ['PENDING', 'COMPLETED'] as const
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number]

/**
 * A recorded repayment between two group members. Settlements are folded
 * into the balance calculation, so once A pays B the outstanding amount
 * drops to zero.
 */
export interface ISettlement extends Document<Types.ObjectId> {
  groupId: Types.ObjectId
  fromMemberId: Types.ObjectId
  toMemberId: Types.ObjectId
  amount: number
  status: SettlementStatus
  note: string
  recordedBy: Types.ObjectId
  settledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const settlementSchema = new Schema<ISettlement>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    fromMemberId: { type: Schema.Types.ObjectId, required: true },
    toMemberId: { type: Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: SETTLEMENT_STATUSES, default: 'COMPLETED' },
    note: { type: String, default: '', trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true },
)

settlementSchema.index({ groupId: 1, createdAt: -1 })

applyJsonTransform(settlementSchema)

export const Settlement: Model<ISettlement> =
  (mongoose.models.Settlement as Model<ISettlement>) ??
  mongoose.model<ISettlement>('Settlement', settlementSchema)

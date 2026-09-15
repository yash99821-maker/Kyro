import mongoose, { Schema, Types, Document, Model } from 'mongoose'
import { applyJsonTransform } from './jsonTransform.js'
import { SPENDING_CATEGORIES } from '../config/constants.js'

export const TRANSACTION_TYPES = [
  'PAYMENT',
  'RECEIVED',
  'RECHARGE',
  'BILL',
  'GROUP',
  'SAVING',
] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const TRANSACTION_STATUSES = ['SUCCESS', 'FAILED', 'PENDING'] as const
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]

export interface IParty {
  name: string
  upiId: string
  userId?: Types.ObjectId
}

export interface ITransaction extends Document<Types.ObjectId> {
  userId: Types.ObjectId
  type: TransactionType
  amount: number
  category: string
  sender: IParty
  receiver: IParty
  status: TransactionStatus
  description: string
  referenceId: string
  /** Amount moved into Kyro Save by the round-up rule for this payment. */
  roundUpAmount: number
  /** Extra context for bill/recharge payments (provider, consumer number...). */
  meta: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const partySchema = new Schema<IParty>(
  {
    name: { type: String, required: true, trim: true },
    upiId: { type: String, default: '', trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
)

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, enum: SPENDING_CATEGORIES, default: 'other', index: true },
    sender: { type: partySchema, required: true },
    receiver: { type: partySchema, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, default: 'SUCCESS', index: true },
    description: { type: String, default: '', trim: true },
    referenceId: { type: String, required: true, unique: true },
    roundUpAmount: { type: Number, default: 0, min: 0 },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

// History screens always read "this user's transactions, newest first".
transactionSchema.index({ userId: 1, createdAt: -1 })

applyJsonTransform(transactionSchema)

export const Transaction: Model<ITransaction> =
  (mongoose.models.Transaction as Model<ITransaction>) ??
  mongoose.model<ITransaction>('Transaction', transactionSchema)

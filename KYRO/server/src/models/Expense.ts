import mongoose, { Schema, Types, Document, Model } from 'mongoose'
import { applyJsonTransform } from './jsonTransform.js'

export const SPLIT_TYPES = ['EQUAL', 'CUSTOM'] as const
export type SplitType = (typeof SPLIT_TYPES)[number]

export interface IExpenseParticipant {
  memberId: Types.ObjectId
  /** Share of the expense this participant owes. Shares sum to `amount`. */
  share: number
}

export interface IExpense extends Document<Types.ObjectId> {
  groupId: Types.ObjectId
  description: string
  amount: number
  /** Group member id (not user id) of whoever paid the bill. */
  paidBy: Types.ObjectId
  splitType: SplitType
  participants: IExpenseParticipant[]
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const participantSchema = new Schema<IExpenseParticipant>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    share: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const expenseSchema = new Schema<IExpense>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paidBy: { type: Schema.Types.ObjectId, required: true },
    splitType: { type: String, enum: SPLIT_TYPES, default: 'EQUAL' },
    participants: { type: [participantSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

expenseSchema.index({ groupId: 1, createdAt: -1 })

applyJsonTransform(expenseSchema)

export const Expense: Model<IExpense> =
  (mongoose.models.Expense as Model<IExpense>) ??
  mongoose.model<IExpense>('Expense', expenseSchema)

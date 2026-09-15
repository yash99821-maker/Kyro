import mongoose, { Schema, Types, Document, Model } from 'mongoose'
import { applyJsonTransform } from './jsonTransform.js'
import bcrypt from 'bcryptjs'

export type RoundUpType = 10 | 50

export interface KyroSaveSettings {
  enabled: boolean
  roundUpTo: RoundUpType
  goalName: string
  goalAmount: number
}

export interface IUser extends Document<Types.ObjectId> {
  name: string
  mobileNumber: string
  email?: string
  profileImage?: string
  upiId: string
  /** bcrypt hash of the 4-digit transaction PIN — never the PIN itself. */
  transactionPinHash: string
  balance: number
  savingsBalance: number
  kyroSave: KyroSaveSettings
  isDemo: boolean
  createdAt: Date
  updatedAt: Date
  setTransactionPin(pin: string): Promise<void>
  verifyTransactionPin(pin: string): Promise<boolean>
}

const kyroSaveSchema = new Schema<KyroSaveSettings>(
  {
    enabled: { type: Boolean, default: true },
    roundUpTo: { type: Number, enum: [10, 50], default: 10 },
    goalName: { type: String, default: 'Savings Goal', trim: true },
    goalAmount: { type: Number, default: 60000, min: 1 },
  },
  { _id: false },
)

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Mobile number must be 10 digits'],
    },
    email: { type: String, trim: true, lowercase: true, default: '' },
    profileImage: { type: String, default: '' },
    upiId: { type: String, required: true, unique: true, trim: true, lowercase: true },
    transactionPinHash: { type: String, required: true, select: false },
    balance: { type: Number, default: 0, min: 0 },
    savingsBalance: { type: Number, default: 0, min: 0 },
    kyroSave: { type: kyroSaveSchema, default: () => ({}) },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
)

userSchema.methods.setTransactionPin = async function (this: IUser, pin: string) {
  this.transactionPinHash = await bcrypt.hash(pin, 10)
}

userSchema.methods.verifyTransactionPin = async function (this: IUser, pin: string) {
  if (!this.transactionPinHash) return false
  return bcrypt.compare(pin, this.transactionPinHash)
}

/** Strip sensitive fields from anything serialised to the client. */
applyJsonTransform(userSchema, ['transactionPinHash'])

export const User: Model<IUser> =
  mongoose.models.User as Model<IUser> ?? mongoose.model<IUser>('User', userSchema)

import mongoose, { Schema, Types, Document, Model } from 'mongoose'

/**
 * Login OTP challenge.
 *
 * The OTP is stored hashed and expires after 5 minutes, mirroring how a real
 * OTP service would behave. In this demo the generated code is always the
 * fixed DEMO_OTP and no SMS is sent — but the backend still issues, stores
 * and verifies the challenge rather than trusting the client.
 */
export interface IOtpToken extends Document<Types.ObjectId> {
  mobileNumber: string
  codeHash: string
  attempts: number
  expiresAt: Date
  createdAt: Date
}

const otpTokenSchema = new Schema<IOtpToken>(
  {
    mobileNumber: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// TTL index: MongoDB removes expired challenges automatically.
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const OtpToken: Model<IOtpToken> =
  (mongoose.models.OtpToken as Model<IOtpToken>) ??
  mongoose.model<IOtpToken>('OtpToken', otpTokenSchema)

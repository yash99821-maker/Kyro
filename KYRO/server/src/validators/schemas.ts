import { z } from 'zod'
import { SPENDING_CATEGORIES } from '../config/constants.js'

/** Shared primitives -------------------------------------------------- */

export const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{10}$/, 'Enter a valid 10-digit mobile number')

export const pinSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{4}$/, 'Your transaction PIN must be 4 digits')

export const amountSchema = z
  .number({ invalid_type_error: 'Enter a valid amount' })
  .positive('Amount must be greater than zero')
  .max(100000, 'Demo limit: a single payment cannot exceed ₹1,00,000')

export const categorySchema = z.enum(SPENDING_CATEGORIES).default('other')

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id')

/** Auth ---------------------------------------------------------------- */

export const loginSchema = z.object({
  mobileNumber: mobileNumberSchema,
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60).optional(),
})

export const verifyOtpSchema = z.object({
  mobileNumber: mobileNumberSchema,
  otp: z.string().trim().regex(/^[0-9]{6}$/, 'Enter the 6-digit OTP'),
  name: z.string().trim().min(2).max(60).optional(),
})

/** Users --------------------------------------------------------------- */

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60).optional(),
  email: z.union([z.string().trim().email('Enter a valid email address'), z.literal('')]).optional(),
  profileImage: z.string().trim().max(500).optional(),
})

export const changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
})

/** Payments ------------------------------------------------------------ */

export const sendMoneySchema = z.object({
  receiverName: z.string().trim().min(1, 'Choose who you are paying').max(60),
  receiverUpiId: z.string().trim().max(80).optional().default(''),
  amount: amountSchema,
  note: z.string().trim().max(140).optional().default(''),
  category: categorySchema,
  pin: pinSchema,
})

export const scanPaySchema = z.object({
  qrPayload: z.string().trim().min(1, 'Scan a valid KYRO QR code').max(300),
  amount: amountSchema,
  note: z.string().trim().max(140).optional().default(''),
  category: categorySchema,
  pin: pinSchema,
})

export const rechargeSchema = z.object({
  mobileNumber: mobileNumberSchema,
  operator: z.string().trim().min(1, 'Choose an operator').max(40),
  amount: amountSchema,
  pin: pinSchema,
})

export const billPaymentSchema = z.object({
  billType: z.string().trim().min(1, 'Choose a bill type').max(40),
  provider: z.string().trim().min(1, 'Choose a provider').max(60),
  consumerNumber: z.string().trim().min(1, 'Enter your consumer number').max(40),
  amount: amountSchema,
  pin: pinSchema,
})

/** Money requests ------------------------------------------------------ */

export const moneyRequestSchema = z.object({
  payeeName: z.string().trim().min(1, 'Choose who to request from').max(60),
  payeeUpiId: z.string().trim().max(80).optional().default(''),
  amount: amountSchema,
  note: z.string().trim().max(140).optional().default(''),
})

export const updateRequestStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
})

/** Kyro Save ----------------------------------------------------------- */

export const savingsSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  roundUpTo: z.union([z.literal(10), z.literal(50)]).optional(),
  goalName: z.string().trim().min(1, 'Give your goal a name').max(40).optional(),
  goalAmount: z
    .number()
    .positive('Goal amount must be greater than zero')
    .max(10000000, 'That goal is too large')
    .optional(),
})

/** Groups -------------------------------------------------------------- */

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Give your group a name').max(50),
  description: z.string().trim().max(140).optional().default(''),
  emoji: z.string().trim().max(8).optional().default('👥'),
  members: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Member name is required').max(50),
        mobileNumber: z
          .union([mobileNumberSchema, z.literal('')])
          .optional()
          .default(''),
      }),
    )
    .max(20, 'A group can have at most 20 members')
    .optional()
    .default([]),
})

export const addMemberSchema = z.object({
  name: z.string().trim().min(1, 'Member name is required').max(50),
  mobileNumber: z
    .union([mobileNumberSchema, z.literal('')])
    .optional()
    .default(''),
})

export const addExpenseSchema = z
  .object({
    description: z.string().trim().min(1, 'Describe the expense').max(80),
    amount: z.number().positive('Amount must be greater than zero').max(1000000),
    paidBy: objectIdSchema,
    splitType: z.enum(['EQUAL', 'CUSTOM']),
    /** For EQUAL: who is included. For CUSTOM: who is included, with amounts. */
    participants: z
      .array(
        z.object({
          memberId: objectIdSchema,
          share: z.number().min(0).optional(),
        }),
      )
      .min(1, 'Select at least one person'),
  })
  .refine(
    (data) =>
      data.splitType !== 'CUSTOM' || data.participants.every((p) => typeof p.share === 'number'),
    { message: 'Enter an amount for every person in a custom split', path: ['participants'] },
  )

export const settleSchema = z.object({
  fromMemberId: objectIdSchema,
  toMemberId: objectIdSchema,
  amount: z.number().positive('Settlement amount must be greater than zero').max(1000000),
  note: z.string().trim().max(140).optional().default(''),
})

/** Transactions query -------------------------------------------------- */

export const transactionQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.string().trim().max(30).optional(),
  type: z.string().trim().max(30).optional(),
  status: z.string().trim().max(20).optional(),
  from: z.string().trim().max(30).optional(),
  to: z.string().trim().max(30).optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { isProduction } from '../config/env.js'

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`))
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  let statusCode = 500
  let message = 'Something went wrong. Please try again.'
  let details: unknown

  if (error instanceof ApiError) {
    statusCode = error.statusCode
    message = error.message
    details = error.details
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400
    message = Object.values(error.errors)[0]?.message ?? 'Invalid data submitted.'
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400
    message = 'That record id is not valid.'
  } else if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
    statusCode = 409
    const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern
    const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue
    const field = keyPattern ? Object.keys(keyPattern)[0] : undefined
    message =
      field === 'mobileNumber'
        ? 'An account with this mobile number already exists.'
        : field === 'upiId'
          ? 'That UPI ID is already taken. Please try a different name.'
          : 'That record already exists.'
    console.error('[kyro:duplicate-key]', { field, keyValue })
  } else if (error instanceof Error && !isProduction) {
    message = error.message
  }

  if (statusCode >= 500) {
    console.error('[kyro:error]', error)
  }

  res.status(statusCode).json({ success: false, message, ...(details ? { details } : {}) })
}
import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { isProduction } from '../config/env.js'

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`))
}

/**
 * Central error handler. Turns anything thrown anywhere in the API into a
 * consistent JSON shape: { success: false, message, details? }.
 */
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
    message = 'That record already exists.'
  } else if (error instanceof Error && !isProduction) {
    message = error.message
  }

  if (statusCode >= 500) {
    console.error('[kyro:error]', error)
  }

  res.status(statusCode).json({ success: false, message, ...(details ? { details } : {}) })
}

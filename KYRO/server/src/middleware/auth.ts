import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User, type IUser } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser
      userId?: string
    }
  }
}

export interface JwtPayload {
  sub: string
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies JwtPayload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7).trim()
  return null
}

/**
 * Protects a route: verifies the JWT, loads the user from MongoDB and
 * attaches it to the request. Every private API route uses this.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req)
    if (!token) throw ApiError.unauthorized()

    let payload: JwtPayload
    try {
      payload = jwt.verify(token, env.jwtSecret) as JwtPayload
    } catch {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.')
    }

    const user = await User.findById(payload.sub)
    if (!user) throw ApiError.unauthorized('Account not found. Please sign in again.')

    req.user = user
    req.userId = String(user._id)
    next()
  } catch (error) {
    next(error)
  }
}

/** Convenience accessor for handlers that run behind `requireAuth`. */
export function currentUser(req: Request): IUser {
  if (!req.user) throw ApiError.unauthorized()
  return req.user
}

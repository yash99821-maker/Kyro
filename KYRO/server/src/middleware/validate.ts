import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodTypeAny } from 'zod'
import { ApiError } from '../utils/ApiError.js'

type Source = 'body' | 'query' | 'params'

/**
 * Validates part of the request against a Zod schema and replaces it with the
 * parsed value, so controllers can rely on well-typed, sanitised input.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source])
      if (source === 'body') req.body = parsed
      else Object.defineProperty(req, source, { value: parsed, writable: true })
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.errors[0]
        const field = first?.path.join('.')
        next(
          ApiError.badRequest(
            field ? `${field}: ${first.message}` : (first?.message ?? 'Invalid request.'),
            error.errors,
          ),
        )
        return
      }
      next(error)
    }
  }
}

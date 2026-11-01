import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new ApiError(400, code, message, details)
export const notFound = (message = 'Not found', details?: unknown) => new ApiError(404, 'not_found', message, details)

/** Small helper so every handler answers with the same envelope. */
export function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ data, demo: true })
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Some parameters or fields are invalid.',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      },
    })
    return
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    })
    return
  }

  // Body-parser rejects malformed JSON with a SyntaxError and status 400.
  if (error instanceof SyntaxError && 'status' in error && (error as { status?: number }).status === 400) {
    res.status(400).json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON.' } })
    return
  }

  console.error('[theru] unhandled API error:', error)
  res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong on the demo server. Try again.' },
  })
}

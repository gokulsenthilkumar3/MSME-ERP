import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.field && { field: err.field }),
      status: err.status,
    });
    return;
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: firstIssue.message,
      field: firstIssue.path.join('.'),
      status: 422,
    });
    return;
  }

  logger.error('Unhandled error', { err: err.message, stack: err.stack });
  res.status(500).json({
    error: 'SERVER_ERROR',
    message: 'An unexpected error occurred',
    status: 500,
  });
}

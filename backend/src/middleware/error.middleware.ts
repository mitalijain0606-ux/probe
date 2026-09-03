import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';
import { logger, currentRequestId } from '../logger/logger.js';
import { incrementCounter } from '../logger/metrics.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} does not exist` },
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const requestId = currentRequestId();

  if (err instanceof ZodError) {
    logger.warn(
      { event: 'http.validation_error', requestId, errorType: 'VALIDATION', issues: err.issues },
      'request validation failed',
    );
    incrementCounter('http_errors_total', { statusCode: 400 });
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    const level = err.statusCode >= 500 ? 'error' : 'warn';
    logger[level](
      { event: 'http.error', requestId, errorType: err.code, message: err.message },
      'request failed',
    );
    incrementCounter('http_errors_total', { statusCode: err.statusCode });
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error({ event: 'http.unhandled_error', requestId, errorType: 'UNHANDLED', message }, 'unhandled error');
  incrementCounter('http_errors_total', { statusCode: 500 });

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong, please try again' },
  });
}

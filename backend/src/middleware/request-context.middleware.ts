import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext, logger } from '../logger/logger.js';
import { incrementCounter, observe } from '../logger/metrics.js';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  res.setHeader('x-request-id', requestId);

  runWithRequestContext({ requestId }, () => {
    const startedAt = performance.now();

    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - startedAt);
      const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;

      logger.info(
        {
          event: 'http.request',
          method: req.method,
          route,
          statusCode: res.statusCode,
          durationMs,
        },
        'request completed',
      );

      incrementCounter('http_requests_total', { method: req.method, statusCode: res.statusCode });
      observe('http_request_duration_ms', durationMs, { route });
    });

    next();
  });
}

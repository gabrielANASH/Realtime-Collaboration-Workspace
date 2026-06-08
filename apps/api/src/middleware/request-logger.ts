import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

export function requestLogger(request: Request, response: Response, next: NextFunction) {
  const start = Date.now();
  const { method, path: requestPath } = request;

  response.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = response;

    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[level]('HTTP request completed', {
      method,
      path: requestPath,
      statusCode,
      durationMs: duration,
      contentLength: response.getHeader('content-length') ?? undefined,
    });
  });

  next();
}

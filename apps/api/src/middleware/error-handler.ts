import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { HttpError } from '../errors/http-error';

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      message: 'Validation failed',
      issues: error.issues,
    });
    return;
  }

  logger.error('Unhandled request error', { error });
  response.status(500).json({
    message: 'Internal Server Error',
  });
}

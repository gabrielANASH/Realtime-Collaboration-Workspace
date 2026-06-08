import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError } from '../errors/http-error';

export function validateBody(schema: ZodTypeAny) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(new HttpError(400, 'Validation failed', 'VALIDATION_ERROR', { issues: result.error.issues }));
      return;
    }

    request.body = result.data;
    next();
  };
}

export function validateParams(schema: ZodTypeAny) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.params);

    if (!result.success) {
      next(new HttpError(400, 'Validation failed', 'VALIDATION_ERROR', { issues: result.error.issues }));
      return;
    }

    Object.assign(request.params, result.data);
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      next(new HttpError(400, 'Invalid query parameters', 'VALIDATION_ERROR', { issues: result.error.issues }));
      return;
    }

    next();
  };
}

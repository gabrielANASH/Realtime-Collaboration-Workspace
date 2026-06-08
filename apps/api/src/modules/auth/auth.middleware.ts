import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { PublicUser } from './auth.types';
import { HttpError } from '../../errors/http-error';

type AccessTokenClaims = jwt.JwtPayload & {
  email?: string;
  name?: string | null;
};

export function requireAccessToken(request: Request, _response: Response, next: NextFunction) {
  const authorizationHeader = request.header('authorization');

  if (!authorizationHeader?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenClaims;

    if (!payload.sub || !payload.email) {
      next(new HttpError(401, 'Unauthorized', 'UNAUTHORIZED'));
      return;
    }

    request.authenticatedUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
    } satisfies PublicUser;

    next();
  } catch {
    next(new HttpError(401, 'Unauthorized', 'UNAUTHORIZED'));
  }
}

import type { NextFunction, Request, Response } from 'express';

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  };
};

export function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  if (!request.user) {
    response.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
}

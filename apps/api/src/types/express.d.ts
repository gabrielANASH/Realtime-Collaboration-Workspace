import type { PublicUser } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: PublicUser;
    }
  }
}

export {};

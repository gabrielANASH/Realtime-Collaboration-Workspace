import type { User } from '@prisma/client';

export type PublicUser = Pick<User, 'id' | 'email' | 'name'> & { createdAt?: Date };

export type AuthSession = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

import type { Membership, User } from '@prisma/client';

export type MemberWithUser = Membership & {
  user: Pick<User, 'id' | 'email' | 'name'>;
};

export type MemberInfo = {
  userId: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
};

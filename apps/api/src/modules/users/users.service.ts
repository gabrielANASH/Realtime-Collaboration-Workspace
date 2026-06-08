import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import type { UpdateProfileInput, ChangePasswordInput } from '@workspace/shared';
import type { PublicUser } from '../auth/auth.types';

export class UsersService {
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }

    if (input.email && input.email !== user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
      if (existingUser) {
        throw new HttpError(409, 'Email already in use', 'EMAIL_ALREADY_EXISTS');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    };
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<{ success: true }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const passwordMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);

    if (!passwordMatches) {
      throw new HttpError(400, 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }
}

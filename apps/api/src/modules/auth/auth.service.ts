import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { RefreshToken, User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../errors/http-error';
import { logger } from '../../lib/logger';
import type { AuthSession, PublicUser } from './auth.types';
import { hashToken, parseDurationToMilliseconds } from './auth.utils';
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
} from '@workspace/shared';

type AccessTokenClaims = {
  sub: string;
  email: string;
  name?: string | null;
};

type RefreshTokenClaims = {
  jti: string;
};

export class AuthService {
  async register(input: RegisterInput): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new HttpError(409, 'Email already in use', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const mentionKey = await this.generateMentionKey(email);
    const user = await prisma.user.create({
      data: {
        email,
        name: input.name?.trim() || null,
        mentionKey,
        passwordHash,
      },
    });

    return this.createSession(user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new HttpError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new HttpError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    return this.createSession(user);
  }

  async logout(input: LogoutInput): Promise<{ success: true }> {
    const tokenRecord = await this.findValidRefreshToken(input.refreshToken);

    if (tokenRecord) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  async refresh(input: RefreshTokenInput): Promise<AuthSession> {
    const tokenRecord = await this.findValidRefreshToken(input.refreshToken);

    if (!tokenRecord) {
      throw new HttpError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.user.findUnique({ where: { id: tokenRecord.userId } });

    if (!user) {
      throw new HttpError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    return this.createSession(user);
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }

    return user;
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ resetUrl?: string }> {
    const email = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.info('Forgot password requested for non-existent email', { email });
      return {};
    }

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    logger.info('Password reset token created', { userId: user.id });

    if (env.NODE_ENV === 'development') {
      const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
      return { resetUrl };
    }

    return {};
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ success: true }> {
    const tokenHash = hashToken(input.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken) {
      throw new HttpError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }

    if (resetToken.usedAt) {
      throw new HttpError(400, 'Reset token has already been used', 'TOKEN_ALREADY_USED');
    }

    if (resetToken.expiresAt.getTime() <= Date.now()) {
      throw new HttpError(400, 'Reset token has expired', 'TOKEN_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info('Password reset completed', { userId: resetToken.userId });

    return { success: true };
  }

  private async createSession(user: User): Promise<AuthSession> {
    const publicUser = this.toPublicUser(user);
    const accessToken = this.signAccessToken(publicUser);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      user: publicUser,
      accessToken,
      refreshToken,
    };
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  private signAccessToken(user: PublicUser): string {
    const payload: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as `${number}${'s' | 'm' | 'h' | 'd' | 'w'}`,
    });
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const refreshTokenId = randomUUID();
    const refreshToken = jwt.sign(
      { jti: refreshTokenId } satisfies RefreshTokenClaims,
      env.JWT_REFRESH_SECRET,
      {
        subject: userId,
        expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as `${number}${'s' | 'm' | 'h' | 'd' | 'w'}`,
      },
    );

    await prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationToMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN)),
      },
    });

    return refreshToken;
  }

  private async findValidRefreshToken(refreshToken: string): Promise<RefreshToken | null> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload & RefreshTokenClaims;

      if (!payload.sub || !payload.jti) {
        return null;
      }

      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { id: payload.jti },
      });

      if (!tokenRecord || tokenRecord.revokedAt) {
        return null;
      }

      if (tokenRecord.expiresAt.getTime() <= Date.now()) {
        return null;
      }

      if (tokenRecord.tokenHash !== hashToken(refreshToken)) {
        return null;
      }

      return tokenRecord;
    } catch {
      return null;
    }
  }

  static generateMentionKey(email: string): string {
    const base = email.split('@')[0]!.toLowerCase().replace(/[^\w]/g, '');
    return base || `user_${randomUUID().slice(0, 8)}`;
  }

  private async generateMentionKey(email: string): Promise<string> {
    const base = AuthService.generateMentionKey(email);
    const existing = await prisma.user.findUnique({ where: { mentionKey: base } });
    if (!existing) return base;
    return `${base}_${randomUUID().slice(0, 4)}`;
  }
}

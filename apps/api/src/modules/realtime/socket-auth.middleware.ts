import { verify } from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

/**
 * Socket.io authentication middleware
 * Validates JWT token from socket handshake query/headers
 */

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    // Extract token from handshake query or headers
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Socket connection attempted without token', { socketId: socket.id });
      return next(new Error('Authentication token required'));
    }

    try {
      // Verify JWT token
      const decoded = verify(token, env.JWT_ACCESS_SECRET) as {
        sub: string;
        email: string;
        name: string;
      };

      // Attach user info to socket
      socket.userId = decoded.sub;
      socket.userEmail = decoded.email;
      socket.userName = decoded.name;

      logger.debug('Socket authenticated', {
        socketId: socket.id,
        userId: decoded.sub,
      });

      next();
    } catch (verifyError) {
      logger.warn('Socket token verification failed', {
        socketId: socket.id,
        error: verifyError instanceof Error ? verifyError.message : 'Unknown error',
      });
      return next(new Error('Invalid or expired token'));
    }
  } catch (error) {
    logger.error('Socket auth middleware error', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return next(new Error('Authentication failed'));
  }
}

/**
 * Verify user is member of workspace before allowing room operations
 */
export async function verifyWorkspaceMembership(userId: string, workspaceId: string): Promise<boolean> {
  try {
    const { prisma } = await import('../../lib/prisma');
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    return !!membership;
  } catch (error) {
    logger.error('Workspace membership check failed', {
      userId,
      workspaceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

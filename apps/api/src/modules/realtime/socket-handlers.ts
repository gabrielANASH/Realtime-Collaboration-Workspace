import { logger } from '../../lib/logger';
import type { AuthenticatedSocket } from './socket-auth.middleware';
import { verifyWorkspaceMembership } from './socket-auth.middleware';
import { z } from 'zod';
import {
  joinWorkspaceRoomSchema,
  leaveWorkspaceRoomSchema,
  userPresenceSchema,
  documentUpdateSchema,
  userCursorSchema,
} from '@workspace/shared';

/**
 * Socket event handlers for realtime collaboration
 * Implements room management, presence tracking, and document updates
 */

interface SocketEventContext {
  socket: AuthenticatedSocket;
  workspaceId: string;
}

/**
 * Handle user joining a workspace room
 * Validates membership and broadcasts user:join event
 */
export async function handleJoinWorkspaceRoom(socket: AuthenticatedSocket, data: unknown) {
  try {
    // Validate payload
    const payload = joinWorkspaceRoomSchema.parse(data);

    // Verify user is member of workspace
    const isMember = await verifyWorkspaceMembership(socket.userId!, payload.workspaceId);
    if (!isMember) {
      socket.emit('error', {
        code: 'NOT_WORKSPACE_MEMBER',
        message: 'You are not a member of this workspace',
      });
      return;
    }

    // Join room (Socket.io convention: workspace:id)
    const roomName = `workspace:${payload.workspaceId}`;
    socket.join(roomName);

    // Broadcast user joined event to room
    socket.to(roomName).emit('user:joined', {
      userId: socket.userId,
      email: socket.userEmail,
      name: socket.userName,
      workspaceId: payload.workspaceId,
      joinedAt: new Date(),
    });

    // Send confirmation to joining user
    socket.emit('room:joined', {
      workspaceId: payload.workspaceId,
      message: 'Successfully joined workspace room',
    });

    logger.info('User joined workspace room', {
      socketId: socket.id,
      userId: socket.userId,
      workspaceId: payload.workspaceId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid join workspace payload',
        issues: error.issues,
      });
      return;
    }

    logger.error('Error joining workspace room', {
      socketId: socket.id,
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    socket.emit('error', {
      code: 'JOIN_WORKSPACE_FAILED',
      message: 'Failed to join workspace room',
    });
  }
}

/**
 * Handle user leaving a workspace room
 */
export async function handleLeaveWorkspaceRoom(socket: AuthenticatedSocket, data: unknown) {
  try {
    const payload = leaveWorkspaceRoomSchema.parse(data);
    const roomName = `workspace:${payload.workspaceId}`;

    // Leave room
    socket.leave(roomName);

    // Broadcast user left event
    socket.to(roomName).emit('user:left', {
      userId: socket.userId,
      workspaceId: payload.workspaceId,
      leftAt: new Date(),
    });

    socket.emit('room:left', {
      workspaceId: payload.workspaceId,
      message: 'Left workspace room',
    });

    logger.info('User left workspace room', {
      socketId: socket.id,
      userId: socket.userId,
      workspaceId: payload.workspaceId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid leave workspace payload',
      });
      return;
    }

    logger.error('Error leaving workspace room', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle user cursor position updates for live editing
 * Broadcasts to all users in the workspace
 */
export async function handleUserCursorUpdate(socket: AuthenticatedSocket, data: unknown) {
  try {
    const payload = userCursorSchema.parse(data);

    // Verify membership
    const isMember = await verifyWorkspaceMembership(socket.userId!, payload.workspaceId);
    if (!isMember) {
      return; // Silently ignore
    }

    const roomName = `workspace:${payload.workspaceId}`;

    // Broadcast cursor position
    socket.to(roomName).emit('user:cursor', {
      userId: socket.userId,
      documentId: payload.documentId,
      line: payload.line,
      column: payload.column,
      color: payload.color,
    });
  } catch (error) {
    if (!(error instanceof z.ZodError)) {
      logger.warn('User cursor update validation failed', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Handle document content updates
 * Broadcasts to all users in the workspace
 */
export async function handleDocumentUpdate(socket: AuthenticatedSocket, data: unknown) {
  try {
    const payload = documentUpdateSchema.parse(data);

    // Verify membership
    const isMember = await verifyWorkspaceMembership(socket.userId!, payload.workspaceId);
    if (!isMember) {
      socket.emit('error', {
        code: 'NOT_WORKSPACE_MEMBER',
        message: 'Not authorized to update this document',
      });
      return;
    }

    const roomName = `workspace:${payload.workspaceId}`;

    // Broadcast document update to all users in workspace
    socket.to(roomName).emit('document:updated', {
      documentId: payload.documentId,
      title: payload.title,
      content: payload.content,
      version: payload.version,
      updatedBy: socket.userId,
      updatedAt: new Date(),
    });

    logger.debug('Document update broadcasted', {
      documentId: payload.documentId,
      userId: socket.userId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid document update payload',
      });
      return;
    }

    logger.error('Error handling document update', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle user disconnection
 * Clean up and broadcast left event
 */
export function handleDisconnect(socket: AuthenticatedSocket, reason: string) {
  try {
    logger.info('User disconnected', {
      socketId: socket.id,
      userId: socket.userId,
      reason,
    });

    // Socket.io automatically removes socket from rooms on disconnect
    // Broadcast to all workspaces they were in (via socket rooms)
    socket.rooms.forEach((room) => {
      if (room.startsWith('workspace:')) {
        socket.to(room).emit('user:disconnected', {
          userId: socket.userId,
          reason,
          disconnectedAt: new Date(),
        });
      }
    });
  } catch (error) {
    logger.error('Error handling disconnect', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle socket errors
 */
export function handleSocketError(socket: AuthenticatedSocket, error: Error) {
  logger.error('Socket error', {
    socketId: socket.id,
    userId: socket.userId,
    error: error.message,
  });
}

/**
 * Handle collaborative document edits
 * Broadcasts edits to all users in the workspace
 */
export async function handleDocumentCollaborativeEdit(
  socket: AuthenticatedSocket,
  data: unknown,
) {
  try {
    const editData = data as {
      documentId: string;
      workspaceId: string;
      edit: any;
      version: number;
    };

    if (!editData.documentId || !editData.workspaceId) {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'Missing documentId or workspaceId',
      });
      return;
    }

    // Verify membership
    const isMember = await verifyWorkspaceMembership(socket.userId!, editData.workspaceId);
    if (!isMember) {
      socket.emit('error', {
        code: 'NOT_WORKSPACE_MEMBER',
        message: 'Not authorized to edit documents in this workspace',
      });
      return;
    }

    const roomName = `workspace:${editData.workspaceId}`;

    // Broadcast edit to all other users in workspace
    socket.to(roomName).emit('document:edit-remote', {
      documentId: editData.documentId,
      edit: editData.edit,
      version: editData.version,
      userId: socket.userId,
      userName: socket.userName,
    });

    logger.debug('Document collaborative edit broadcasted', {
      documentId: editData.documentId,
      userId: socket.userId,
    });
  } catch (error) {
    logger.error('Error handling collaborative edit', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

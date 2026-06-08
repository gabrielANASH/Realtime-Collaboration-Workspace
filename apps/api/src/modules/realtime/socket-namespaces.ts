import type { Server as SocketServer, Socket } from 'socket.io';
import { socketAuthMiddleware, type AuthenticatedSocket } from './socket-auth.middleware';
import {
  handleJoinWorkspaceRoom,
  handleLeaveWorkspaceRoom,
  handleUserCursorUpdate,
  handleDocumentUpdate,
  handleDocumentCollaborativeEdit,
  handleDisconnect,
  handleSocketError,
} from './socket-handlers';
import { logger } from '../../lib/logger';

/**
 * Setup Socket.io namespaces and event handlers
 * Organizes real-time communication into logical event groups
 */

export function setupSocketNamespaces(io: SocketServer) {
  /**
   * Main workspace namespace for all realtime events
   * All authenticated users connect to this namespace
   */
  const workspaceNamespace = io.of('/workspace');

  // Apply authentication middleware
  workspaceNamespace.use((socket: Socket, next: (err?: Error) => void) => {
    socketAuthMiddleware(socket as AuthenticatedSocket, next);
  });

  /**
   * Connection handler
   * Triggered when a new client connects after auth
   */
  workspaceNamespace.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;

    logger.info('Client connected to workspace namespace', {
      socketId: socket.id,
      userId: authSocket.userId,
      email: authSocket.userEmail,
    });

    /**
     * Room Management Events
     */

    // User joins a workspace room
    socket.on('workspace:join', (data) => {
      handleJoinWorkspaceRoom(authSocket, data);
    });

    // User leaves a workspace room
    socket.on('workspace:leave', (data) => {
      handleLeaveWorkspaceRoom(authSocket, data);
    });

    /**
     * Presence Events
     */

    // User updates cursor position
    socket.on('cursor:update', (data) => {
      handleUserCursorUpdate(authSocket, data);
    });

    // User sends presence heartbeat (for online status)
    socket.on('presence:ping', () => {
      socket.emit('presence:pong');
    });

    /**
     * Document Events
     */

    // Collaborative document edit
    socket.on('document:edit', (data) => {
      handleDocumentCollaborativeEdit(authSocket, data);
    });

    // Document content update
    socket.on('document:update', (data) => {
      handleDocumentUpdate(authSocket, data);
    });

    /**
     * Lifecycle Events
     */

    // Client disconnects
    socket.on('disconnect', (reason: string) => {
      handleDisconnect(authSocket, reason);
    });

    // Socket error
    socket.on('error', (error: Error) => {
      handleSocketError(authSocket, error);
    });
  });

  logger.info('Socket.io namespaces initialized', {
    namespaces: ['/workspace'],
  });

  return {
    workspaceNamespace,
  };
}

/**
 * Utility to broadcast a message to all users in a workspace
 */
export function broadcastToWorkspace(io: SocketServer, workspaceId: string, event: string, data: unknown) {
  const roomName = `workspace:${workspaceId}`;
  io.of('/workspace').to(roomName).emit(event, data);
}

/**
 * Utility to broadcast to specific user
 */
export function sendToUser(io: SocketServer, userId: string, event: string, data: unknown) {
  // In a real app, you'd maintain a userId -> socketId mapping
  // For now, we'd need to implement this via a session store
  io.of('/workspace').emit(`user:${userId}:${event}`, data);
}

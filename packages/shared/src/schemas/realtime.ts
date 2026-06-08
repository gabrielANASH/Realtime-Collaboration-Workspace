import { z } from 'zod';

/**
 * Socket.io Event Schemas
 * Zod schemas for validating realtime events from clients
 */

// Authentication
export const socketAuthSchema = z.object({
  token: z.string().min(1, 'Token required'),
});

export type SocketAuthPayload = z.infer<typeof socketAuthSchema>;

// Room Management
export const joinWorkspaceRoomSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export type JoinWorkspaceRoomPayload = z.infer<typeof joinWorkspaceRoomSchema>;

export const leaveWorkspaceRoomSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export type LeaveWorkspaceRoomPayload = z.infer<typeof leaveWorkspaceRoomSchema>;

// Presence Events
export const userPresenceSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  workspaceId: z.string().uuid(),
  status: z.enum(['online', 'away', 'offline']),
  lastSeen: z.number().int(),
});

export type UserPresence = z.infer<typeof userPresenceSchema>;

export const userCursorSchema = z.object({
  workspaceId: z.string().uuid(),
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  line: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color code'),
});

export type UserCursor = z.infer<typeof userCursorSchema>;

// Document Events
export const documentUpdateSchema = z.object({
  documentId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  version: z.number().int().nonnegative(),
});

export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;

export const documentDeleteSchema = z.object({
  documentId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export type DocumentDelete = z.infer<typeof documentDeleteSchema>;

// Workspace Events
export const workspaceMemberJoinedSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  joinedAt: z.date(),
});

export type WorkspaceMemberJoined = z.infer<typeof workspaceMemberJoinedSchema>;

// Notification Events
export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['member_invited', 'document_shared', 'comment_mentioned']),
  title: z.string().min(1),
  message: z.string(),
  data: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

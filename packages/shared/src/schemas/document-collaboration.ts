import { z } from 'zod';

/**
 * Collaborative editing schemas
 * Define edit operations, conflict handling, and synchronization
 */

// Individual edit operation
export const documentEditSchema = z.object({
  type: z.enum(['insert', 'delete', 'replace']),
  position: z.number().int().nonnegative(),
  content: z.string(),
  length: z.number().int().nonnegative().optional(), // For delete operations
  timestamp: z.number().int(),
  userId: z.string().uuid(),
});

export type DocumentEdit = z.infer<typeof documentEditSchema>;

// Batch of edits sent to server for persistence
export const documentEditBatchSchema = z.object({
  edits: z.array(documentEditSchema).min(1),
  baseVersion: z.number().int().nonnegative(), // Version when user started editing
  currentVersion: z.number().int().nonnegative(), // Latest version on client
});

export type DocumentEditBatch = z.infer<typeof documentEditBatchSchema>;

// Server response for successful edit persistence
export const documentSaveResponseSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().nonnegative(),
  content: z.string(),
  updatedAt: z.date(),
  savedEdits: z.number().int(), // How many edits were applied
});

export type DocumentSaveResponse = z.infer<typeof documentSaveResponseSchema>;

// Conflict response when versions don't match
export const documentConflictSchema = z.object({
  code: z.literal('VERSION_MISMATCH'),
  message: z.string(),
  serverVersion: z.number().int().nonnegative(),
  serverContent: z.string(),
  clientVersion: z.number().int().nonnegative(),
  conflictingEdits: z.array(documentEditSchema).optional(),
});

export type DocumentConflict = z.infer<typeof documentConflictSchema>;

// Real-time edit broadcast to collaborators
export const documentEditBroadcastSchema = z.object({
  documentId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  edit: documentEditSchema,
  version: z.number().int().nonnegative(),
  userId: z.string().uuid(),
  userName: z.string(),
});

export type DocumentEditBroadcast = z.infer<typeof documentEditBroadcastSchema>;

// Editor state for presence/activity
export const documentEditorStateSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  version: z.number().int().nonnegative(),
  position: z.number().int().nonnegative(), // Current cursor position
  selectionStart: z.number().int().nonnegative().optional(),
  selectionEnd: z.number().int().nonnegative().optional(),
  status: z.enum(['typing', 'viewing', 'idle']),
  lastEdited: z.date(),
});

export type DocumentEditorState = z.infer<typeof documentEditorStateSchema>;

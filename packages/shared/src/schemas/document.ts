import { z } from 'zod';

export const documentTitleSchema = z.string().trim().min(1).max(160);
export const documentIdSchema = z.string().uuid();

export const createDocumentSchema = z.object({
  title: documentTitleSchema,
  content: z.string().default(''),
});

export const updateDocumentSchema = z.object({
  title: documentTitleSchema.optional(),
  content: z.string().optional(),
});

export const documentIdParamSchema = z.object({
  documentId: documentIdSchema,
});

export const workspaceDocumentsParamSchema = z.object({
  workspaceId: z.string().uuid(),
});

// Collaborative editing schema
export const documentEditSchema = z.object({
  type: z.enum(['insert', 'delete', 'replace']),
  position: z.number().int().nonnegative(),
  content: z.string(),
  length: z.number().int().nonnegative().optional(),
  timestamp: z.number().int(),
  userId: z.string().uuid(),
});

export const documentCollaborationSchema = z.object({
  edits: z.array(documentEditSchema).min(1),
  baseVersion: z.number().int().nonnegative(),
  currentVersion: z.number().int().nonnegative(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentEdit = z.infer<typeof documentEditSchema>;
export type DocumentCollaborationInput = z.infer<typeof documentCollaborationSchema>;

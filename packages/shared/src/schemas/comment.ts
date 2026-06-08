import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const commentIdParamSchema = z.object({
  commentId: z.string().uuid(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

import { z } from 'zod';

export const workspaceNameSchema = z.string().min(2).max(120);
export const workspaceIdSchema = z.string().uuid();

export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  description: z.string().max(500).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: workspaceNameSchema.optional(),
  description: z.string().max(500).nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export const workspaceIdParamSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const removeMemberSchema = z.object({});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

export const listMembersParamSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

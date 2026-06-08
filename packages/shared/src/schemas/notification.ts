import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'workspace_invite',
  'mention',
  'document_update',
  'system',
]);

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(500),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

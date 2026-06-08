import type { Workspace } from '@prisma/client';

export type WorkspaceSummary = Pick<Workspace, 'id' | 'name' | 'ownerId' | 'createdAt'>;

export type WorkspaceDetail = WorkspaceSummary & {
  description: string | null;
  memberCount: number;
};

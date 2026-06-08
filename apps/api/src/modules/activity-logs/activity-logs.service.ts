import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';

type ActivityLogRecord = {
  id: string;
  workspaceId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
  actor: { id: string; email: string; name: string | null } | null;
};

export class ActivityLogsService {
  async getWorkspaceActivity(
    userId: string,
    workspaceId: string,
    limit = 50,
    cursor?: string,
  ): Promise<ActivityLogRecord[]> {
    await this.assertUserInWorkspace(userId, workspaceId);

    return prisma.activityLog.findMany({
      where: {
        workspaceId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      include: {
        actor: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async createActivityLog(
    workspaceId: string,
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    const data: Record<string, unknown> = {
      workspaceId,
      actorId,
      action,
      entityType,
      entityId,
    };

    if (metadata) {
      data.metadata = metadata;
    }

    return prisma.activityLog.create({
      data: data as Parameters<typeof prisma.activityLog.create>[0]['data'],
      include: {
        actor: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  private async assertUserInWorkspace(userId: string, workspaceId: string): Promise<void> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new HttpError(403, 'Not a member of this workspace', 'NOT_WORKSPACE_MEMBER');
    }
  }
}

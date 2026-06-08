import type { Workspace } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '@workspace/shared';
import type { WorkspaceDetail, WorkspaceSummary } from './workspaces.types';

type WorkspaceWithMembership = Workspace & {
  membershipRole?: string;
};

export class WorkspacesService {
  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<WorkspaceSummary> {
    const workspace = await prisma.workspace.create({
      data: {
        name: input.name.trim(),
        ...(input.description ? { description: input.description.trim() } : {}),
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
    });

    return this.toWorkspaceSummary(workspace);
  }

  async updateWorkspace(userId: string, workspaceId: string, input: UpdateWorkspaceInput): Promise<WorkspaceSummary> {
    await this.assertCanManageWorkspace(userId, workspaceId);

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    return this.toWorkspaceSummary(workspace);
  }

  async deleteWorkspace(userId: string, workspaceId: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, ownerId: true },
    });

    if (!workspace) {
      throw new HttpError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND');
    }

    if (workspace.ownerId !== userId) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
  }

  async getWorkspace(userId: string, workspaceId: string): Promise<WorkspaceDetail> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!workspace) {
      throw new HttpError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND');
    }

    await this.assertUserInWorkspace(userId, workspaceId);

    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      description: workspace.description,
      createdAt: workspace.createdAt,
      memberCount: workspace._count.members,
    };
  }

  async getUserWorkspaces(userId: string): Promise<Array<WorkspaceSummary & { role: string }>> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return memberships.map(({ role, workspace }) => ({
      ...workspace,
      role,
    }));
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

  private async assertCanManageWorkspace(userId: string, workspaceId: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        ownerId: true,
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      throw new HttpError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND');
    }

    if (workspace.ownerId === userId) {
      return;
    }

    const role = workspace.members[0]?.role;

    if (role === 'admin') {
      return;
    }

    throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
  }

  private toWorkspaceSummary(workspace: Workspace): WorkspaceSummary {
    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt,
    };
  }
}

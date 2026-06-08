import type { WorkspaceRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import { getPermissions, canPromoteToRole } from './members.authorization';
import type { MemberInfo } from './members.types';
import type { InviteMemberInput, UpdateMemberRoleInput } from '@workspace/shared';

export class MembersService {
  async inviteMember(
    actorId: string,
    workspaceId: string,
    input: InviteMemberInput,
  ): Promise<MemberInfo> {
    const workspace = await this.getWorkspaceWithMembership(workspaceId, actorId);

    const permissions = getPermissions(workspace.memberRole as WorkspaceRole);
    if (!permissions.canInviteMembers) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }

    const email = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new HttpError(400, 'User not found', 'USER_NOT_FOUND');
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (existingMembership) {
      throw new HttpError(409, 'User is already a member', 'ALREADY_MEMBER');
    }

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        workspaceId,
        role: input.role as WorkspaceRole,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: membership.role as 'owner' | 'admin' | 'member' | 'viewer',
      joinedAt: membership.createdAt,
    };
  }

  async removeMember(actorId: string, workspaceId: string, memberId: string): Promise<void> {
    const workspace = await this.getWorkspaceWithMembership(workspaceId, actorId);

    const permissions = getPermissions(workspace.memberRole as WorkspaceRole);
    if (!permissions.canRemoveMembers) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
      select: { role: true },
    });

    if (!targetMembership) {
      throw new HttpError(404, 'Member not found', 'MEMBER_NOT_FOUND');
    }

    if (targetMembership.role === 'owner' && workspace.memberRole !== 'owner') {
      throw new HttpError(403, 'Cannot remove workspace owner', 'CANNOT_REMOVE_OWNER');
    }

    if (actorId === memberId && workspace.memberRole !== 'owner') {
      throw new HttpError(403, 'Cannot remove yourself', 'CANNOT_REMOVE_SELF');
    }

    await prisma.membership.delete({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
    });
  }

  async updateMemberRole(
    actorId: string,
    workspaceId: string,
    memberId: string,
    input: UpdateMemberRoleInput,
  ): Promise<MemberInfo> {
    const workspace = await this.getWorkspaceWithMembership(workspaceId, actorId);

    const permissions = getPermissions(workspace.memberRole as WorkspaceRole);
    if (!permissions.canUpdateRoles) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }

    if (!canPromoteToRole(workspace.memberRole as WorkspaceRole, input.role as WorkspaceRole)) {
      throw new HttpError(403, 'Cannot promote to this role', 'CANNOT_PROMOTE_TO_ROLE');
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    if (!targetMembership) {
      throw new HttpError(404, 'Member not found', 'MEMBER_NOT_FOUND');
    }

    if (targetMembership.role === 'owner') {
      throw new HttpError(403, 'Cannot change owner role', 'CANNOT_CHANGE_OWNER_ROLE');
    }

    const updated = await prisma.membership.update({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
      data: {
        role: input.role as WorkspaceRole,
      },
    });

    return {
      userId: memberId,
      email: targetMembership.user.email,
      name: targetMembership.user.name,
      role: updated.role as 'owner' | 'admin' | 'member' | 'viewer',
      joinedAt: updated.updatedAt,
    };
  }

  async listMembers(actorId: string, workspaceId: string): Promise<MemberInfo[]> {
    const workspace = await this.getWorkspaceWithMembership(workspaceId, actorId);

    const memberships = await prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role as 'owner' | 'admin' | 'member' | 'viewer',
      joinedAt: m.createdAt,
    }));
  }

  private async getWorkspaceWithMembership(
    workspaceId: string,
    userId: string,
  ): Promise<{ memberRole: string }> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new HttpError(403, 'Not a member of this workspace', 'NOT_WORKSPACE_MEMBER');
    }

    return { memberRole: membership.role };
  }
}

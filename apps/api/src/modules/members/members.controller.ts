import type { NextFunction, Request, Response } from 'express';
import { getIO } from '../../lib/socket';
import { MembersService } from './members.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { prisma } from '../../lib/prisma';
import type { InviteMemberInput, UpdateMemberRoleInput } from '@workspace/shared';

export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  inviteMember = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaceId = request.params.workspaceId as string;
      const member = await this.membersService.inviteMember(
        authenticatedUser.id,
        workspaceId,
        request.body as InviteMemberInput,
      );

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      });

      if (workspace) {
        await this.notificationsService.createNotification(
          member.userId,
          'workspace_invite',
          `Invited to ${workspace.name}`,
          `You have been invited to join the workspace "${workspace.name}" as ${member.role}.`,
          workspaceId,
        );

        try {
          const io = getIO();
          io.of('/workspace').emit('notification:new', { userId: member.userId });
        } catch {
          // Socket not available
        }
      }

      await this.activityLogsService.createActivityLog(
        workspaceId,
        authenticatedUser.id,
        'member_invited',
        'membership',
        member.userId,
        { email: member.email, role: member.role },
      );

      try {
        const io = getIO();
        io.of('/workspace').to(`workspace:${workspaceId}`).emit('activity:created', { workspaceId });
      } catch {
        // Socket not available
      }

      response.status(201).json({ member });
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaceId = request.params.workspaceId as string;
      const memberId = request.params.userId as string;

      const targetMember = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: memberId,
            workspaceId,
          },
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      });

      await this.membersService.removeMember(authenticatedUser.id, workspaceId, memberId);

      await this.activityLogsService.createActivityLog(
        workspaceId,
        authenticatedUser.id,
        'member_removed',
        'membership',
        memberId,
        { email: targetMember?.user.email, name: targetMember?.user.name },
      );

      try {
        const io = getIO();
        io.of('/workspace').to(`workspace:${workspaceId}`).emit('activity:created', { workspaceId });
      } catch {
        // Socket not available
      }

      response.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  updateMemberRole = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaceId = request.params.workspaceId as string;
      const memberId = request.params.userId as string;

      const oldRole = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: memberId,
            workspaceId,
          },
        },
        select: { role: true },
      });

      const member = await this.membersService.updateMemberRole(
        authenticatedUser.id,
        workspaceId,
        memberId,
        request.body as UpdateMemberRoleInput,
      );

      await this.activityLogsService.createActivityLog(
        workspaceId,
        authenticatedUser.id,
        'member_role_changed',
        'membership',
        memberId,
        {
          email: member.email,
          oldRole: oldRole?.role,
          newRole: member.role,
        },
      );

      try {
        const io = getIO();
        io.of('/workspace').to(`workspace:${workspaceId}`).emit('activity:created', { workspaceId });
      } catch {
        // Socket not available
      }

      response.status(200).json({ member });
    } catch (error) {
      next(error);
    }
  };

  listMembers = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaceId = request.params.workspaceId as string;
      const members = await this.membersService.listMembers(authenticatedUser.id, workspaceId);

      response.status(200).json({ members });
    } catch (error) {
      next(error);
    }
  };
}

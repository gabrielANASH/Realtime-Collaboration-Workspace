import type { NextFunction, Request, Response } from 'express';
import { getIO } from '../../lib/socket';
import { CommentsService } from './comments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { prisma } from '../../lib/prisma';
import type { CreateCommentInput } from '@workspace/shared';

export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  createComment = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaceId = request.params.workspaceId as string;
      const documentId = request.params.documentId as string;

      const comment = await this.commentsService.createComment(
        authenticatedUser.id,
        documentId,
        request.body as CreateCommentInput,
      );

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true },
      });

      await this.activityLogsService.createActivityLog(
        workspaceId,
        authenticatedUser.id,
        'comment_created',
        'comment',
        comment.id,
        { documentId, documentTitle: document?.title },
      );

      const mentionKeys = this.commentsService.parseMentions(comment.content);

      if (mentionKeys.length > 0) {
        const members = await this.commentsService.getWorkspaceMembers(documentId);

        for (const key of mentionKeys) {
          const matchedMember = members.find(
            (m) => m.mentionKey?.toLowerCase() === key.toLowerCase() && m.id !== authenticatedUser.id,
          );
          if (!matchedMember) continue;

          await this.notificationsService.createNotification(
            matchedMember.id,
            'mention',
            `Mentioned by ${authenticatedUser.name || authenticatedUser.email}`,
            `${authenticatedUser.name || authenticatedUser.email} mentioned you in a comment: "${comment.content.slice(0, 100)}"`,
            workspaceId,
          );

          try {
            const io = getIO();
            io.of('/workspace').emit('notification:new', { userId: matchedMember.id });
          } catch {
            // Socket not available
          }
        }
      }

      try {
        const io = getIO();
        io.of('/workspace').to(`workspace:${workspaceId}`).emit('comment:new', {
          documentId,
          comment,
        });
      } catch {
        // Socket not available
      }

      response.status(201).json({ comment });
    } catch (error) {
      next(error);
    }
  };

  listComments = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const documentId = request.params.documentId as string;
      const comments = await this.commentsService.listComments(documentId);

      response.status(200).json({ comments });
    } catch (error) {
      next(error);
    }
  };

  deleteComment = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const commentId = request.params.commentId as string;
      await this.commentsService.deleteComment(authenticatedUser.id, commentId);

      response.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}

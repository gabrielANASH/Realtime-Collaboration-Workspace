import { Router } from 'express';
import { createCommentSchema, commentIdParamSchema } from '@workspace/shared';
import { validateBody, validateParams } from '../../middleware/validate-request';
import { requireAccessToken } from '../auth/auth.middleware';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

export function setupCommentsRoutes(router: Router) {
  const commentsController = new CommentsController(
    new CommentsService(),
    new NotificationsService(),
    new ActivityLogsService(),
  );

  router.get('/', requireAccessToken, commentsController.listComments);
  router.post('/', requireAccessToken, validateBody(createCommentSchema), commentsController.createComment);
  router.delete('/:commentId', requireAccessToken, validateParams(commentIdParamSchema), commentsController.deleteComment);
}

import { Router } from 'express';
import { inviteMemberSchema, updateMemberRoleSchema, userIdParamSchema } from '@workspace/shared';
import { validateBody, validateParams } from '../../middleware/validate-request';
import { requireAccessToken } from '../auth/auth.middleware';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

export const membersRouter = Router({ mergeParams: true });

const membersController = new MembersController(
  new MembersService(),
  new NotificationsService(),
  new ActivityLogsService(),
);

membersRouter.get('/', requireAccessToken, membersController.listMembers);
membersRouter.post('/', requireAccessToken, validateBody(inviteMemberSchema), membersController.inviteMember);
membersRouter.delete('/:userId', requireAccessToken, validateParams(userIdParamSchema), membersController.removeMember);
membersRouter.patch('/:userId/role', requireAccessToken, validateParams(userIdParamSchema), validateBody(updateMemberRoleSchema), membersController.updateMemberRole);

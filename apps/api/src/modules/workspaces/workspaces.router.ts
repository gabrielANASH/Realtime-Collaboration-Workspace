import { Router } from 'express';
import { createWorkspaceSchema, updateWorkspaceSchema, workspaceIdParamSchema } from '@workspace/shared';
import { validateBody, validateParams } from '../../middleware/validate-request';
import { requireAccessToken } from '../auth/auth.middleware';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { membersRouter } from '../members/members.router';
import { documentsRouter } from '../documents/documents.router';
import { activityLogsRouter } from '../activity-logs/activity-logs.router';

export const workspacesRouter = Router();

const workspacesController = new WorkspacesController(new WorkspacesService(), new ActivityLogsService());

workspacesRouter.get('/', requireAccessToken, workspacesController.getUserWorkspaces);
workspacesRouter.get('/:workspaceId', requireAccessToken, validateParams(workspaceIdParamSchema), workspacesController.getWorkspace);
workspacesRouter.post('/', requireAccessToken, validateBody(createWorkspaceSchema), workspacesController.createWorkspace);
workspacesRouter.patch(
  '/:workspaceId',
  requireAccessToken,
  validateParams(workspaceIdParamSchema),
  validateBody(updateWorkspaceSchema),
  workspacesController.updateWorkspace,
);
workspacesRouter.delete('/:workspaceId', requireAccessToken, validateParams(workspaceIdParamSchema), workspacesController.deleteWorkspace);
workspacesRouter.use('/:workspaceId/members', membersRouter);
workspacesRouter.use('/:workspaceId/documents', documentsRouter);
workspacesRouter.use('/:workspaceId/activity', activityLogsRouter);

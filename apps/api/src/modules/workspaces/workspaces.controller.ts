import type { NextFunction, Request, Response } from 'express';
import { WorkspacesService } from './workspaces.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '@workspace/shared';

export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  createWorkspace = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspace = await this.workspacesService.createWorkspace(authenticatedUser.id, request.body as CreateWorkspaceInput);

      await this.activityLogsService.createActivityLog(
        workspace.id,
        authenticatedUser.id,
        'workspace_created',
        'workspace',
        workspace.id,
        { name: workspace.name },
      );

      response.status(201).json({ workspace });
    } catch (error) {
      next(error);
    }
  };

  updateWorkspace = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspace = await this.workspacesService.updateWorkspace(
        authenticatedUser.id,
        request.params.workspaceId as string,
        request.body as UpdateWorkspaceInput,
      );

      response.status(200).json({ workspace });
    } catch (error) {
      next(error);
    }
  };

  deleteWorkspace = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await this.workspacesService.deleteWorkspace(authenticatedUser.id, request.params.workspaceId as string);
      response.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getWorkspace = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspace = await this.workspacesService.getWorkspace(
        authenticatedUser.id,
        request.params.workspaceId as string,
      );

      response.status(200).json({ workspace });
    } catch (error) {
      next(error);
    }
  };

  getUserWorkspaces = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaces = await this.workspacesService.getUserWorkspaces(authenticatedUser.id);
      response.status(200).json({ workspaces });
    } catch (error) {
      next(error);
    }
  };
}

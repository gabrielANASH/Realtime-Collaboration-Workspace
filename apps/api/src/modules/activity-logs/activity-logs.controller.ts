import type { NextFunction, Request, Response } from 'express';
import { ActivityLogsService } from './activity-logs.service';

export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  getActivityLogs = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaceId = request.params.workspaceId as string;
      const limit = request.query.limit ? parseInt(request.query.limit as string, 10) : 50;
      const cursor = request.query.cursor as string | undefined;

      const logs = await this.activityLogsService.getWorkspaceActivity(
        authenticatedUser.id,
        workspaceId,
        limit,
        cursor,
      );

      response.json({ items: logs });
    } catch (error) {
      next(error);
    }
  };
}

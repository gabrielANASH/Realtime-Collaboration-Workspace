import { Router } from 'express';
import { requireAccessToken } from '../auth/auth.middleware';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';

export const activityLogsRouter = Router({ mergeParams: true });

const activityLogsController = new ActivityLogsController(new ActivityLogsService());

activityLogsRouter.get('/', requireAccessToken, activityLogsController.getActivityLogs);

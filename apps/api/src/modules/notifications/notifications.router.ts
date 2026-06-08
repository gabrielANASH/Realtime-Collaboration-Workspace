import { Router } from 'express';
import { requireAccessToken } from '../auth/auth.middleware';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

export const notificationsRouter = Router();

const notificationsController = new NotificationsController(new NotificationsService());

notificationsRouter.get('/', requireAccessToken, notificationsController.getNotifications);
notificationsRouter.get('/unread-count', requireAccessToken, notificationsController.getUnreadCount);
notificationsRouter.patch('/read-all', requireAccessToken, notificationsController.markAllAsRead);
notificationsRouter.patch('/:id/read', requireAccessToken, notificationsController.markAsRead);

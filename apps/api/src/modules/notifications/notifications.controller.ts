import type { NextFunction, Request, Response } from 'express';
import { NotificationsService } from './notifications.service';

export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  getNotifications = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const unreadOnly = request.query.unread === 'true';
      const notifications = await this.notificationsService.getUserNotifications(
        authenticatedUser.id,
        unreadOnly,
      );

      response.json({ notifications });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await this.notificationsService.markAsRead(
        authenticatedUser.id,
        request.params.id as string,
      );

      response.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await this.notificationsService.markAllAsRead(authenticatedUser.id);

      response.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const notifications = await this.notificationsService.getUserNotifications(
        authenticatedUser.id,
        true,
      );

      response.json({ count: notifications.length });
    } catch (error) {
      next(error);
    }
  };
}

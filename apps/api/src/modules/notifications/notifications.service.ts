import type { NotificationType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';

type NotificationRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

export class NotificationsService {
  async getUserNotifications(
    userId: string,
    unreadOnly?: boolean,
  ): Promise<NotificationRecord[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });

    if (!notification) {
      throw new HttpError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    if (notification.userId !== userId) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    workspaceId?: string,
  ): Promise<NotificationRecord> {
    return prisma.notification.create({
      data: {
        userId,
        workspaceId: workspaceId ?? null,
        type,
        title,
        body,
      },
    });
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type NotificationRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: 'workspace_invite' | 'mention' | 'document_update' | 'system';
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export async function listNotificationsRequest(
  accessToken: string,
  unreadOnly?: boolean,
): Promise<NotificationRecord[]> {
  const params = unreadOnly ? '?unread=true' : '';
  const response = await fetch(`${API_URL}/notifications${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  const data = await response.json();
  return data.notifications;
}

export async function markNotificationReadRequest(
  notificationId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

export async function markAllNotificationsReadRequest(accessToken: string): Promise<void> {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to mark all as read');
  }
}

export async function getUnreadCountRequest(accessToken: string): Promise<number> {
  const response = await fetch(`${API_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }

  const data = await response.json();
  return data.count;
}

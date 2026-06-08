'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  listNotificationsRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
  type NotificationRecord,
} from './notification-api';

export function useNotifications() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listNotificationsRequest(accessToken);
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = () => {
      fetchNotifications();
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      try {
        await markNotificationReadRequest(id, accessToken);
      } catch {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: null } : n)),
        );
      }
    },
    [accessToken],
  );

  const markAllAsRead = useCallback(async () => {
    if (!accessToken) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: now })));
    try {
      await markAllNotificationsReadRequest(accessToken);
    } catch {
      fetchNotifications();
    }
  }, [accessToken, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refresh: fetchNotifications };
}

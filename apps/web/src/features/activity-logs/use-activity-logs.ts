'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  listActivityLogsRequest,
  type ActivityLogRecord,
} from './activity-log-api';

const PAGE_SIZE = 50;

export function useActivityLogs(workspaceId: string | undefined | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);

  const fetchLogs = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listActivityLogsRequest(workspaceId, accessToken, PAGE_SIZE);
      setLogs(data);
      cursorRef.current = data.length === PAGE_SIZE ? data[data.length - 1]?.id : undefined;
      hasMoreRef.current = data.length === PAGE_SIZE;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId]);

  const loadMore = useCallback(async () => {
    if (!accessToken || !workspaceId || !cursorRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await listActivityLogsRequest(workspaceId, accessToken, PAGE_SIZE, cursorRef.current);
      setLogs((prev) => [...prev, ...data]);
      cursorRef.current = data.length === PAGE_SIZE ? data[data.length - 1]?.id : undefined;
      hasMoreRef.current = data.length === PAGE_SIZE;
    } catch {
      // silently fail on load-more
    } finally {
      setLoadingMore(false);
    }
  }, [accessToken, workspaceId, loadingMore]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !workspaceId) return;

    const handleActivityCreated = (data: { workspaceId: string }) => {
      if (data.workspaceId === workspaceId) {
        fetchLogs();
      }
    };

    socket.on('activity:created', handleActivityCreated);
    return () => {
      socket.off('activity:created', handleActivityCreated);
    };
  }, [workspaceId, fetchLogs]);

  return { logs, loading, error, refresh: fetchLogs, hasMore: hasMoreRef.current, loadMore, loadingMore };
}

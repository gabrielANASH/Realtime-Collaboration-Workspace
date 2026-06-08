'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket-client';
import type { Socket } from 'socket.io-client';

/**
 * Hook to join a workspace room when component mounts
 * Automatically leaves when component unmounts
 */
export function useWorkspaceRoom(workspaceId: string | null | undefined) {
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const socket = getSocket();
    if (!socket || !socket.connected) return;

    // Join workspace room
    socket.emit('workspace:join', { workspaceId });

    // Listen for room joined confirmation
    const handleRoomJoined = () => {
      setIsJoined(true);
      setError(null);
    };

    socket.on('room:joined', handleRoomJoined);

    // Cleanup: leave room on unmount
    return () => {
      socket.emit('workspace:leave', { workspaceId });
      socket.off('room:joined', handleRoomJoined);
    };
  }, [workspaceId]);

  return { isJoined, error };
}

/**
 * Hook to listen for other users joining/leaving the workspace
 */
export function useWorkspacePresence(workspaceId: string | null | undefined) {
  const [users, setUsers] = useState<Array<{ userId: string; email: string; name: string }>>([
  ]);

  useEffect(() => {
    if (!workspaceId) return;

    const socket = getSocket();
    if (!socket) return;

    // User joined workspace
    const handleUserJoined = (data: {
      userId: string;
      email: string;
      name: string;
    }) => {
      setUsers((prev) => {
        // Avoid duplicates
        if (prev.find((u) => u.userId === data.userId)) return prev;
        return [...prev, data];
      });
    };

    // User left workspace
    const handleUserLeft = (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    // User disconnected
    const handleUserDisconnected = (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('user:disconnected', handleUserDisconnected);

    return () => {
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
      socket.off('user:disconnected', handleUserDisconnected);
    };
  }, [workspaceId]);

  return { users };
}

/**
 * Hook for real-time document collaboration
 * Listens for document updates from other users
 */
export function useDocumentSync(documentId: string | null | undefined) {
  const [remoteContent, setRemoteContent] = useState<string | null>(null);
  const [remoteVersion, setRemoteVersion] = useState(0);

  useEffect(() => {
    if (!documentId) return;

    const socket = getSocket();
    if (!socket) return;

    // Listen for document updates from other users
    const handleDocumentUpdate = (data: {
      documentId: string;
      title?: string;
      content?: string;
      version: number;
      updatedBy: string;
      updatedAt: string;
    }) => {
      if (data.documentId === documentId) {
        if (data.content) {
          setRemoteContent(data.content);
        }
        setRemoteVersion(data.version);
      }
    };

    socket.on('document:updated', handleDocumentUpdate);

    return () => {
      socket.off('document:updated', handleDocumentUpdate);
    };
  }, [documentId]);

  return { remoteContent, remoteVersion };
}

/**
 * Hook to broadcast cursor position to other users
 */
export function useUserCursor(workspaceId: string | null | undefined, documentId: string | null | undefined) {
  const throttleTimerRef = useRef<NodeJS.Timeout>(undefined);

  const updateCursor = useCallback(
    (line: number, column: number, color = '#3b82f6') => {
      if (!workspaceId || !documentId) return;

      const socket = getSocket();
      if (!socket) return;

      // Throttle updates to every 50ms to avoid flooding the server
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }

      throttleTimerRef.current = setTimeout(() => {
        socket.emit('cursor:update', {
          workspaceId,
          documentId,
          line,
          column,
          color,
        });
      }, 50);
    },
    [workspaceId, documentId],
  );

  // Listen for remote cursor updates
  const [remoteCursors, setRemoteCursors] = useState<
    Array<{ userId: string; line: number; column: number; color: string }>
  >([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUserCursor = (data: {
      userId: string;
      documentId: string;
      line: number;
      column: number;
      color: string;
    }) => {
      if (data.documentId === documentId) {
        setRemoteCursors((prev) => {
          const filtered = prev.filter((c) => c.userId !== data.userId);
          return [...filtered, data];
        });
      }
    };

    socket.on('user:cursor', handleUserCursor);

    return () => {
      socket.off('user:cursor', handleUserCursor);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [documentId]);

  return { updateCursor, remoteCursors };
}

/**
 * Hook to broadcast document updates
 */
export function useBroadcastDocumentUpdate(workspaceId: string | null | undefined) {
  const sendDocumentUpdate = useCallback(
    (documentId: string, title?: string, content?: string, version = 1) => {
      if (!workspaceId) return;

      const socket = getSocket();
      if (!socket) return;

      socket.emit('document:update', {
        documentId,
        workspaceId,
        title,
        content,
        version,
      });
    },
    [workspaceId],
  );

  return { sendDocumentUpdate };
}

/**
 * Hook for presence heartbeat (keep-alive)
 * Sends periodic ping to maintain connection
 */
export function usePresenceHeartbeat(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    if (!socket) return;

    // Send presence ping every 30 seconds
    const heartbeatInterval = setInterval(() => {
      socket.emit('presence:ping');
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [enabled]);
}

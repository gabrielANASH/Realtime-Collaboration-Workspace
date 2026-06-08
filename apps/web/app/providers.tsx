'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { initializeSocket, disconnectSocket } from '@/lib/socket-client';
import { usePresenceHeartbeat } from '@/hooks/use-realtime';

export function Providers({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);

  // Sync token to cookie for middleware auth checks
  useEffect(() => {
    if (accessToken) {
      document.cookie = `auth-token=${accessToken}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax';
    }
  }, [accessToken]);

  // Initialize Socket.io when auth token is available
  useEffect(() => {
    if (accessToken) {
      try {
        initializeSocket(accessToken);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    } else {
      disconnectSocket();
    }

    return () => {
      // Keep socket connected across page navigations
      // Only disconnect on logout (handled in auth-store)
    };
  }, [accessToken]);

  return (
    <>
      {children}
      <PresenceHeartbeat />
    </>
  );
}

/**
 * Internal component for socket presence heartbeat
 */
function PresenceHeartbeat() {
  usePresenceHeartbeat(true);
  return null;
}

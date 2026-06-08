'use client';

import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Initialize Socket.io connection with authentication
 * Call this once when the app loads with a valid JWT token
 */
export function initializeSocket(accessToken: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(`${SOCKET_URL}/workspace`, {
    auth: {
      token: accessToken,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
  });

  // Log connection events
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error: Error) => {
    console.error('[Socket] Connection error:', error);
  });

  socket.on('error', (error: unknown) => {
    console.error('[Socket] Error:', error);
  });

  return socket;
}

/**
 * Get the current Socket.io instance
 * Returns null if not initialized
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect from Socket.io server
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if Socket.io is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

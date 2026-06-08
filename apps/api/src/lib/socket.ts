import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../config/env';

let io: SocketServer | null = null;

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io server not initialized. Call createSocketServer first.');
  }
  return io;
}

export function createSocketServer(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.SOCKET_CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,
    connectTimeout: 45000,
  });

  return io;
}

export type { Socket } from 'socket.io';
export { Server as SocketServer } from 'socket.io';

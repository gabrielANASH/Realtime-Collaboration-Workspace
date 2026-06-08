import type { Server as SocketServer } from 'socket.io';

export class RealtimeGateway {
  constructor(private readonly io: SocketServer) {}

  register() {
    this.io.on('connection', (socket) => {
      socket.emit('connected', { socketId: socket.id });
    });
  }
}

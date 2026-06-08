import { createServer } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { createSocketServer } from './lib/socket';
import { setupSocketNamespaces } from './modules/realtime';
import { logger } from './lib/logger';

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason),
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

const httpServer = createServer(app);

const io = createSocketServer(httpServer);

setupSocketNamespaces(io);

httpServer.listen(env.PORT, () => {
  logger.info('API and Socket.io listening', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  });
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
    io.close();
    logger.info('Socket.io server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

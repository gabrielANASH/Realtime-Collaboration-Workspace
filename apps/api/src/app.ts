import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.router';
import { healthRouter } from './modules/health/health.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { usersRouter } from './modules/users/users.router';
import { workspacesRouter } from './modules/workspaces/workspaces.router';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { generalLimiter, authLimiter } from './middleware/rate-limiter';
import { env } from './config/env';

export const app = express();

app.use(helmet());
app.use(cors({
  origin: env.SOCKET_CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/auth', authLimiter, authRouter);
app.use('/users', generalLimiter, usersRouter);
app.use('/workspaces', generalLimiter, workspacesRouter);
app.use('/notifications', generalLimiter, notificationsRouter);
app.use('/health', healthRouter);

app.use(errorHandler);

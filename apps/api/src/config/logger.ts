import { env } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentRank = LEVEL_RANK[env.LOG_LEVEL] ?? LEVEL_RANK.info;

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= currentRank;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('debug')) {
      const entry = { level: 'debug', message, meta, timestamp: new Date().toISOString() };
      console.log(JSON.stringify(entry));
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('info')) {
      const entry = { level: 'info', message, meta, timestamp: new Date().toISOString() };
      console.log(JSON.stringify(entry));
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      const entry = { level: 'warn', message, meta, timestamp: new Date().toISOString() };
      console.log(JSON.stringify(entry));
    }
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      const entry = { level: 'error', message, meta, timestamp: new Date().toISOString() };
      console.log(JSON.stringify(entry));
    }
  },
};

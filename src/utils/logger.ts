import { Request } from 'express';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  requestId?: string;
  userId?: number;
  [key: string]: any;
}

export function log(level: LogLevel, message: string, context: LogContext = {}) {
  const timestamp = new Date().toISOString();
  const logObject = {
    timestamp,
    level,
    message,
    service: 'event-api',
    ...context,
  };

  // JSON format for structured logging - optimal for Loki
  console.log(JSON.stringify(logObject));
}

export function requestLogger(
  req: Request,
  message: string,
  level: LogLevel = LogLevel.INFO,
  additionalContext: Record<string, any> = {},
) {
  log(level, message, {
    requestId: req.id,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    ...additionalContext,
  });
}

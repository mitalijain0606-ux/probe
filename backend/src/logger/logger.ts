import { AsyncLocalStorage } from 'node:async_hooks';
import pino, { type Logger } from 'pino';
import { env, isTest } from '../config/env.js';

interface RequestContext {
  requestId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  'password',
  'confirmPassword',
  'passwordHash',
  'token',
  'accessToken',
  'jwt',
  '*.password',
  '*.passwordHash',
  '*.token',
];

export const logger: Logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'url-health-platform', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: { paths: redactPaths, censor: '[redacted]' },
  mixin() {
    const ctx = storage.getStore();
    if (!ctx) return {};
    return ctx.userId ? { requestId: ctx.requestId, userId: ctx.userId } : { requestId: ctx.requestId };
  },
  ...(env.LOG_PRETTY
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname,service,env' },
        },
      }
    : {}),
});

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function setContextUser(userId: string): void {
  const ctx = storage.getStore();
  if (ctx) ctx.userId = userId;
}

export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

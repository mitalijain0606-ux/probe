import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

function optionalString() {
  return z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.string().trim().min(1).optional(),
  );
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('uho_token'),
  COOKIE_SECURE: bool.default('false'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  FRONTEND_URL: z.string().default('http://localhost:5173'),

  REQUEST_TIMEOUT: z.coerce.number().int().positive().default(10000),
  MAX_CONCURRENT_CHECKS: z.coerce.number().int().positive().max(200).default(10),
  MONITOR_INTERVAL: z.coerce.number().int().min(30).default(300),
  CHECK_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  CHECK_RETRY_BASE_MS: z.coerce.number().int().min(50).default(250),
  CHECK_MAX_REDIRECTS: z.coerce.number().int().min(0).max(10).default(3),
  CHECK_MAX_BODY_BYTES: z.coerce.number().int().min(0).default(65536),
  USER_AGENT: z.string().default('UrlHealthMonitor/1.0 (+observability-platform)'),

  ALLOW_PRIVATE_TARGETS: bool.default('false'),

  HISTORY_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
  ALERT_FAILURE_THRESHOLD: z.coerce.number().int().min(1).default(3),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: bool.default('false'),

  SMTP_HOST: optionalString(),
  SMTP_PORT: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  SMTP_USER: optionalString(),
  SMTP_PASSWORD: optionalString(),
  ALERT_FROM_EMAIL: optionalString(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

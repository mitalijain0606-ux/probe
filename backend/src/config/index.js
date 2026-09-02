const dotenv = require('dotenv');
dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/healthwatch?schema=public',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-prod-minimum-32-chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  email: {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'HealthWatch <alerts@healthwatch.io>',
  },
  monitoring: {
    timeoutMs: parseInt(process.env.CHECK_TIMEOUT_MS, 10) || 8000,
    defaultIntervalMinutes: parseInt(process.env.DEFAULT_CHECK_INTERVAL_MINUTES, 10) || 5,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 15,
  },
};

module.exports = config;

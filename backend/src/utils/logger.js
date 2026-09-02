const pino = require('pino');

const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  redact: {
    paths: [
      'req.headers.authorization',
      'password',
      'passwordHash',
      'token',
      'JWT_SECRET',
      'EMAIL_PASSWORD',
    ],
    remove: true,
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

module.exports = logger;

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      event: 'rate_limit_exceeded',
      correlationId: req.correlationId,
      path: req.originalUrl,
      ip: req.ip,
    });
    res.status(429).json({
      success: false,
      message: 'Too many API requests from this IP. Please try again in 15 minutes.',
    });
  },
});

// Stricter rate limiter for authentication routes (login & signup)
const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      event: 'auth_rate_limit_exceeded',
      correlationId: req.correlationId,
      path: req.originalUrl,
      ip: req.ip,
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};

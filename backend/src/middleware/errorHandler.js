const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    correlationId: req.correlationId,
  });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected internal error occurred';

  logger.error({
    event: 'server_error',
    correlationId: req.correlationId,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    message,
    correlationId: req.correlationId,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

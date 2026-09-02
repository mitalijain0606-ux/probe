const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const responseTimeMs = Math.round((diff[0] * 1e3) + (diff[1] * 1e-6));

    logger.info({
      event: 'http_request',
      correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: responseTimeMs,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

module.exports = requestLogger;

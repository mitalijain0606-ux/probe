const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({
      event: 'authentication_failure',
      correlationId: req.correlationId,
      reason: 'missing_or_malformed_token',
      ip: req.ip,
      path: req.originalUrl,
    });
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  } catch (err) {
    logger.warn({
      event: 'authentication_failure',
      correlationId: req.correlationId,
      reason: err.name,
      ip: req.ip,
      path: req.originalUrl,
    });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token.',
    });
  }
}

module.exports = authenticate;

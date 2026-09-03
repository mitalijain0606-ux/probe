const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const urlRoutes = require('./routes/urlRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Trust reverse proxy hops (Render, Railway, Heroku, Cloudflare, etc.)
app.set('trust proxy', 1);

// Cross-Origin Resource Sharing
app.use(cors({
  origin: true, // Allow frontend dev server and production origins
  credentials: true,
}));
app.options('*', cors());

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Body parsers (supporting up to 5MB for JSON batch imports)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Structured JSON request logger & correlation ID generator
app.use(requestLogger);

// General rate limiter for all API endpoints
app.use('/api', apiLimiter);

// Health check endpoint for container / load-balancer probes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'url-health-observability-platform',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Fallback handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

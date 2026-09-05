import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { requestContext } from './middleware/request-context.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import authRoutes from './modules/auth/routes/auth.routes.js';
import urlRoutes from './modules/urls/routes/url.routes.js';
import reportRoutes from './modules/reports/routes/report.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin, matched FRONTEND_URL, or any *.vercel.app domain
        if (
          !origin ||
          origin === env.FRONTEND_URL ||
          origin.endsWith('.vercel.app') ||
          origin.startsWith('http://localhost:')
        ) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(requestContext);

  const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/urls', urlRoutes);
  app.use('/api/dashboard', reportRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

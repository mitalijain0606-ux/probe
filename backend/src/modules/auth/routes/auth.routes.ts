import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../../config/env.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import * as authController from '../controller/auth.controller.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again shortly' } },
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;

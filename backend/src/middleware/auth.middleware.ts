import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { setContextUser } from '../logger/logger.js';
import { verifyToken } from '../modules/auth/service/token.service.js';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: 'USER' | 'ADMIN' };
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookieToken = req.cookies?.[env.COOKIE_NAME];
  return typeof cookieToken === 'string' ? cookieToken : null;
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(AppError.unauthorized());
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    setContextUser(payload.sub);
    next();
  } catch {
    next(AppError.unauthorized('Session expired or invalid, please log in again'));
  }
}

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    next(AppError.forbidden('Administrator access required'));
    return;
  }
  next();
}

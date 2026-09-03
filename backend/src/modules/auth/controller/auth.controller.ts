import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { setAuthCookie, clearAuthCookie } from '../../../config/cookies.js';
import * as authService from '../service/auth.service.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';

export const register = asyncHandler(async (req, res: Response) => {
  const input = registerSchema.parse(req.body);
  const { user, token } = await authService.register(input);
  setAuthCookie(res, token);
  res.status(201).json({ success: true, data: { user, token } });
});

export const login = asyncHandler(async (req, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { user, token } = await authService.login(input);
  setAuthCookie(res, token);
  res.status(200).json({ success: true, data: { user, token } });
});

export const logout = asyncHandler(async (_req, res: Response) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, data: { message: 'Logged out' } });
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await authService.getProfile(req.user!.id);
  res.status(200).json({ success: true, data: profile });
});

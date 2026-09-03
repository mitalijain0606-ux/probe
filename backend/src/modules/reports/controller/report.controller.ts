import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { snapshot } from '../../../logger/metrics.js';
import * as reportService from '../service/report.service.js';

export const summary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await reportService.getDashboardSummary(req.user!.id);
  res.status(200).json({ success: true, data });
});

export const metrics = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ success: true, data: snapshot() });
});

export const adminOverview = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const data = await reportService.getPlatformOverview();
  res.status(200).json({ success: true, data });
});

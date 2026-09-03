import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { AppError } from '../../../utils/app-error.js';
import { createUrlSchema, bulkUploadSchema, historyQuerySchema } from '../schemas/url.schema.js';
import * as urlService from '../service/url.service.js';

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const urls = await urlService.listForUser(req.user!.id);
  res.status(200).json({ success: true, data: urls });
});

export const listAllForAdmin = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const urls = await urlService.listAllForAdmin();
  res.status(200).json({ success: true, data: urls });
});

export const getOne = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const url = await urlService.getForUser(req.params.id as string, req.user!.id);
  res.status(200).json({ success: true, data: url });
});

export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = createUrlSchema.parse(req.body);
  const url = await urlService.createForUser(req.user!.id, input);
  res.status(201).json({ success: true, data: url });
});

export const bulkCreate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = bulkUploadSchema.parse(req.body);
  const result = await urlService.bulkCreateForUser(req.user!.id, input);
  res.status(201).json({ success: true, data: result });
});

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await urlService.deleteForUser(req.params.id as string, req.user!.id);
  res.status(200).json({ success: true, data: { message: 'Monitored URL deleted' } });
});

export const triggerCheck = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = await urlService.triggerManualCheck(req.params.id as string, req.user!.id);
  if (!jobId) throw AppError.internal('Failed to enqueue check');
  res.status(202).json({ success: true, data: { jobId } });
});

export const history = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { range } = historyQuerySchema.parse(req.query);
  const rows = await urlService.getHistory(req.params.id as string, req.user!.id, range);
  res.status(200).json({ success: true, data: rows });
});

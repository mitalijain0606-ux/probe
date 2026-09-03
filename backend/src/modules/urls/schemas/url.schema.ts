import { z } from 'zod';
import { HISTORY_RANGES } from '../../../config/constants.js';

export const createUrlSchema = z.object({
  url: z.string().trim().min(1, 'URL is required').max(2048),
  label: z.string().trim().max(120).optional(),
  intervalSec: z.number().int().min(30).max(86400).optional(),
});

export const bulkUploadSchema = z.object({
  urls: z
    .array(
      z.union([
        z.string().trim().min(1),
        z.object({ url: z.string().trim().min(1), label: z.string().trim().max(120).optional() }),
      ]),
    )
    .min(1, 'Provide at least one URL')
    .max(500, 'A maximum of 500 URLs can be uploaded at once'),
});

export const historyQuerySchema = z.object({
  range: z.enum(Object.keys(HISTORY_RANGES) as [keyof typeof HISTORY_RANGES]).default('24h'),
});

export type CreateUrlInput = z.infer<typeof createUrlSchema>;
export type BulkUploadInput = z.infer<typeof bulkUploadSchema>;

import { AppError } from '../../../utils/app-error.js';
import { logger } from '../../../logger/logger.js';
import { normalizeUrl, parseTarget } from '../../../utils/url-guard.js';
import { bigIntToNumber, uptimePercentage, round } from '../../../utils/serialize.js';
import * as urlRepository from '../repository/url.repository.js';
import * as checkResultRepository from '../../monitoring/repository/check-result.repository.js';
import { enqueueJob } from '../../../jobs/job-queue.js';
import { HISTORY_RANGES, type HistoryRange } from '../../../config/constants.js';
import type { BulkUploadInput, CreateUrlInput } from '../schemas/url.schema.js';

function serializeUrl(record: {
  id: string;
  url: string;
  label: string | null;
  isActive: boolean;
  intervalSec: number;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    totalChecks: bigint;
    successfulChecks: bigint;
    failedChecks: bigint;
    totalResponseTime: bigint;
    responseSamples: bigint;
    lastStatus: string | null;
    lastStatusCode: number | null;
    lastResponseTimeMs: number | null;
    lastErrorType: string | null;
    lastCheckedAt: Date | null;
    consecutiveFails: number;
  } | null;
}) {
  const totalChecks = bigIntToNumber(record.stats?.totalChecks);
  const successfulChecks = bigIntToNumber(record.stats?.successfulChecks);
  const responseSamples = bigIntToNumber(record.stats?.responseSamples);
  const totalResponseTime = bigIntToNumber(record.stats?.totalResponseTime);

  return {
    id: record.id,
    url: record.url,
    label: record.label,
    isActive: record.isActive,
    intervalSec: record.intervalSec,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    currentStatus: record.stats?.lastStatus ?? null,
    currentStatusCode: record.stats?.lastStatusCode ?? null,
    currentResponseTimeMs: record.stats?.lastResponseTimeMs ?? null,
    lastErrorType: record.stats?.lastErrorType ?? null,
    lastCheckedAt: record.stats?.lastCheckedAt ?? null,
    totalChecks,
    failures: bigIntToNumber(record.stats?.failedChecks),
    uptimePct: uptimePercentage(successfulChecks, totalChecks),
    averageResponseTimeMs: responseSamples === 0 ? null : round(totalResponseTime / responseSamples, 0),
  };
}

function normalizeInputUrl(raw: string): string {
  const normalized = normalizeUrl(raw);
  if (!normalized) throw AppError.badRequest(`"${raw}" is not a valid http(s) URL`);
  const target = parseTarget(normalized);
  if (!target.ok) throw AppError.badRequest(target.message);
  return normalized;
}

export async function listForUser(userId: string) {
  const records = await urlRepository.findManyByUser(userId);
  return records.map(serializeUrl);
}

export async function listAllForAdmin() {
  const records = await urlRepository.findAllWithOwner();
  return records.map((record) => ({
    ...serializeUrl(record),
    owner: { id: record.user.id, name: record.user.name, email: record.user.email },
  }));
}

export async function getForUser(id: string, userId: string) {
  const record = await urlRepository.findByIdForUser(id, userId);
  if (!record) throw AppError.notFound('Monitored URL not found');
  return serializeUrl(record);
}

export async function createForUser(userId: string, input: CreateUrlInput) {
  const normalized = normalizeInputUrl(input.url);

  const existing = await urlRepository.existsForUser(userId, normalized);
  if (existing) throw AppError.conflict('This URL is already being monitored');

  const record = await urlRepository.create({
    userId,
    url: normalized,
    label: input.label ?? null,
    intervalSec: input.intervalSec,
  });

  logger.info({ event: 'url.created', userId, urlId: record.id }, 'monitored url created');
  return serializeUrl(record);
}

export async function bulkCreateForUser(userId: string, input: BulkUploadInput) {
  const errors: Array<{ url: string; message: string }> = [];
  const candidates: Array<{ url: string; label?: string | null }> = [];
  const seen = new Set<string>();

  for (const entry of input.urls) {
    const raw = typeof entry === 'string' ? entry : entry.url;
    const label = typeof entry === 'string' ? undefined : entry.label;
    try {
      const normalized = normalizeInputUrl(raw);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      candidates.push({ url: normalized, label: label ?? null });
    } catch {
      errors.push({ url: raw, message: 'Invalid or unsupported URL' });
    }
  }

  const { created } = await urlRepository.createManyIgnoringDuplicates(
    candidates.map((c) => ({ userId, url: c.url, label: c.label })),
  );

  logger.info(
    { event: 'url.bulk_created', userId, submitted: input.urls.length, created, rejected: errors.length },
    'bulk url upload processed',
  );

  return { created, skipped: input.urls.length - created - errors.length, errors };
}

export async function deleteForUser(id: string, userId: string) {
  const result = await urlRepository.remove(id, userId);
  if (result.count === 0) throw AppError.notFound('Monitored URL not found');
  logger.info({ event: 'url.deleted', userId, urlId: id }, 'monitored url deleted');
}

export async function triggerManualCheck(id: string, userId: string) {
  const record = await urlRepository.findByIdForUser(id, userId);
  if (!record) throw AppError.notFound('Monitored URL not found');

  const job = enqueueJob({ urlId: record.id, url: record.url, triggeredBy: 'manual' });
  logger.info({ event: 'url.manual_check_enqueued', userId, urlId: id, jobId: job.id }, 'manual check enqueued');
  return { jobId: job.id };
}

export async function getHistory(id: string, userId: string, range: HistoryRange) {
  const record = await urlRepository.findByIdForUser(id, userId);
  if (!record) throw AppError.notFound('Monitored URL not found');

  const since = new Date(Date.now() - HISTORY_RANGES[range]);
  const rows = await checkResultRepository.findHistory(id, since);

  return rows.map((row) => ({
    id: row.id.toString(),
    status: row.status,
    statusCode: row.statusCode,
    responseTimeMs: row.responseTimeMs,
    errorType: row.errorType,
    errorMessage: row.errorMessage,
    checkedAt: row.checkedAt,
  }));
}

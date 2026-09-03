import { prisma } from '../../../database/prisma.js';
import type { CheckStatus, ErrorType } from '@prisma/client';
import type { HealthCheckResult } from '../service/health-check.types.js';

export async function saveCheckResult(urlId: string, result: HealthCheckResult) {
  const isUp = result.status === 'UP';

  const [checkResult, urlStats] = await prisma.$transaction([
    prisma.checkResult.create({
      data: {
        urlId,
        status: result.status as CheckStatus,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        errorType: result.errorType as ErrorType | null,
        errorMessage: result.errorMessage,
        attempts: result.attempts,
        checkedAt: result.checkedAt,
      },
    }),
    prisma.urlStats.upsert({
      where: { urlId },
      create: {
        urlId,
        totalChecks: 1,
        successfulChecks: isUp ? 1 : 0,
        failedChecks: isUp ? 0 : 1,
        totalResponseTime: result.responseTimeMs ?? 0,
        responseSamples: result.responseTimeMs !== null ? 1 : 0,
        lastStatus: result.status as CheckStatus,
        lastStatusCode: result.statusCode,
        lastResponseTimeMs: result.responseTimeMs,
        lastErrorType: result.errorType as ErrorType | null,
        lastCheckedAt: result.checkedAt,
        consecutiveFails: isUp ? 0 : 1,
      },
      update: {
        totalChecks: { increment: 1 },
        successfulChecks: isUp ? { increment: 1 } : undefined,
        failedChecks: isUp ? undefined : { increment: 1 },
        totalResponseTime: result.responseTimeMs !== null ? { increment: result.responseTimeMs } : undefined,
        responseSamples: result.responseTimeMs !== null ? { increment: 1 } : undefined,
        lastStatus: result.status as CheckStatus,
        lastStatusCode: result.statusCode,
        lastResponseTimeMs: result.responseTimeMs,
        lastErrorType: result.errorType as ErrorType | null,
        lastCheckedAt: result.checkedAt,
        consecutiveFails: isUp ? 0 : { increment: 1 },
      },
    }),
  ]);

  return { checkResult, consecutiveFails: urlStats.consecutiveFails };
}

export function findHistory(urlId: string, since: Date) {
  return prisma.checkResult.findMany({
    where: { urlId, checkedAt: { gte: since } },
    orderBy: { checkedAt: 'asc' },
    select: {
      id: true,
      status: true,
      statusCode: true,
      responseTimeMs: true,
      errorType: true,
      errorMessage: true,
      checkedAt: true,
    },
  });
}

export function purgeOlderThan(cutoff: Date) {
  return prisma.checkResult.deleteMany({ where: { checkedAt: { lt: cutoff } } });
}

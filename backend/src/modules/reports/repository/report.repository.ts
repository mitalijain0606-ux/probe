import { prisma } from '../../../database/prisma.js';

export async function aggregateForUser(userId: string) {
  const [totals, aggregate] = await Promise.all([
    prisma.monitoredUrl.groupBy({
      by: ['userId'],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{
      total_urls: bigint;
      up: bigint;
      down: bigint;
      unknown: bigint;
      total_checks: bigint;
      successful_checks: bigint;
      failed_checks: bigint;
      avg_response_time: number | null;
    }>>`
      SELECT
        COUNT(mu.id)::bigint AS total_urls,
        COUNT(*) FILTER (WHERE us."lastStatus" = 'UP')::bigint AS up,
        COUNT(*) FILTER (WHERE us."lastStatus" = 'DOWN')::bigint AS down,
        COUNT(*) FILTER (WHERE us."lastStatus" IS NULL)::bigint AS unknown,
        COALESCE(SUM(us."totalChecks"), 0)::bigint AS total_checks,
        COALESCE(SUM(us."successfulChecks"), 0)::bigint AS successful_checks,
        COALESCE(SUM(us."failedChecks"), 0)::bigint AS failed_checks,
        CASE WHEN COALESCE(SUM(us."responseSamples"), 0) = 0 THEN NULL
             ELSE SUM(us."totalResponseTime")::float / SUM(us."responseSamples")
        END AS avg_response_time
      FROM monitored_urls mu
      LEFT JOIN url_stats us ON us."urlId" = mu.id
      WHERE mu."userId" = ${userId}::uuid
    `,
  ]);

  return {
    totalUrls: totals[0]?._count._all ?? 0,
    summary: aggregate[0] ?? {
      total_urls: 0n,
      up: 0n,
      down: 0n,
      unknown: 0n,
      total_checks: 0n,
      successful_checks: 0n,
      failed_checks: 0n,
      avg_response_time: null,
    },
  };
}

export async function aggregateForAllUsers() {
  const [userCount, aggregate] = await Promise.all([
    prisma.user.count(),
    prisma.$queryRaw<Array<{
      total_urls: bigint;
      up: bigint;
      down: bigint;
      unknown: bigint;
      total_checks: bigint;
      successful_checks: bigint;
      failed_checks: bigint;
      avg_response_time: number | null;
    }>>`
      SELECT
        COUNT(mu.id)::bigint AS total_urls,
        COUNT(*) FILTER (WHERE us."lastStatus" = 'UP')::bigint AS up,
        COUNT(*) FILTER (WHERE us."lastStatus" = 'DOWN')::bigint AS down,
        COUNT(*) FILTER (WHERE us."lastStatus" IS NULL)::bigint AS unknown,
        COALESCE(SUM(us."totalChecks"), 0)::bigint AS total_checks,
        COALESCE(SUM(us."successfulChecks"), 0)::bigint AS successful_checks,
        COALESCE(SUM(us."failedChecks"), 0)::bigint AS failed_checks,
        CASE WHEN COALESCE(SUM(us."responseSamples"), 0) = 0 THEN NULL
             ELSE SUM(us."totalResponseTime")::float / SUM(us."responseSamples")
        END AS avg_response_time
      FROM monitored_urls mu
      LEFT JOIN url_stats us ON us."urlId" = mu.id
    `,
  ]);

  return {
    totalUsers: userCount,
    summary: aggregate[0] ?? {
      total_urls: 0n,
      up: 0n,
      down: 0n,
      unknown: 0n,
      total_checks: 0n,
      successful_checks: 0n,
      failed_checks: 0n,
      avg_response_time: null,
    },
  };
}

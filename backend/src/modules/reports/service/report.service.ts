import { bigIntToNumber, uptimePercentage, round } from '../../../utils/serialize.js';
import * as reportRepository from '../repository/report.repository.js';

export async function getDashboardSummary(userId: string) {
  const { summary } = await reportRepository.aggregateForUser(userId);

  const totalUrls = bigIntToNumber(summary.total_urls);
  const up = bigIntToNumber(summary.up);
  const down = bigIntToNumber(summary.down);
  const unknown = bigIntToNumber(summary.unknown);
  const totalChecks = bigIntToNumber(summary.total_checks);
  const successfulChecks = bigIntToNumber(summary.successful_checks);
  const failedChecks = bigIntToNumber(summary.failed_checks);

  return {
    totalUrls,
    up,
    down,
    unknown,
    uptimePct: uptimePercentage(successfulChecks, totalChecks),
    failures: failedChecks,
    averageResponseTimeMs: summary.avg_response_time === null ? null : round(summary.avg_response_time, 0),
  };
}

export async function getPlatformOverview() {
  const { totalUsers, summary } = await reportRepository.aggregateForAllUsers();

  const totalUrls = bigIntToNumber(summary.total_urls);
  const up = bigIntToNumber(summary.up);
  const down = bigIntToNumber(summary.down);
  const unknown = bigIntToNumber(summary.unknown);
  const totalChecks = bigIntToNumber(summary.total_checks);
  const successfulChecks = bigIntToNumber(summary.successful_checks);
  const failedChecks = bigIntToNumber(summary.failed_checks);

  return {
    totalUsers,
    totalUrls,
    up,
    down,
    unknown,
    uptimePct: uptimePercentage(successfulChecks, totalChecks),
    failures: failedChecks,
    averageResponseTimeMs: summary.avg_response_time === null ? null : round(summary.avg_response_time, 0),
  };
}

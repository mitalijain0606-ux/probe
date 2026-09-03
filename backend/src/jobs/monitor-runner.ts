import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';
import { observe } from '../logger/metrics.js';
import { checkUrl } from '../modules/monitoring/service/health-check.service.js';
import { saveCheckResult } from '../modules/monitoring/repository/check-result.repository.js';
import { findActiveWithLabel } from '../modules/urls/repository/url.repository.js';
import { publishToUser } from '../websocket/publisher.js';
import { sendDownAlertEmail } from '../utils/mailer.js';
import { registerJobHandler, type CheckJob } from './job-queue.js';
import { runScheduledSweep } from './sweep.job.js';

async function handleCheckJob(job: CheckJob): Promise<void> {
  const { id: jobId, urlId, url, triggeredBy } = job;
  const startedAt = Date.now();

  logger.info({ event: 'monitor.job_started', jobId, urlId, triggeredBy }, 'processing health check job');

  const record = await findActiveWithLabel(urlId);
  if (!record) {
    logger.warn({ event: 'monitor.job_skipped', jobId, urlId, reason: 'url_not_found' }, 'url no longer exists');
    return;
  }

  const result = await checkUrl(url);
  const { consecutiveFails } = await saveCheckResult(urlId, result);

  observe('monitor_job_duration_ms', Date.now() - startedAt, { triggeredBy });

  logger.info(
    {
      event: 'monitoring.check_completed',
      jobId,
      urlId,
      status: result.status,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      errorType: result.errorType,
      triggeredBy,
    },
    'health check completed',
  );

  publishToUser(record.userId, 'url:check-completed', {
    urlId,
    status: result.status,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    errorType: result.errorType,
    checkedAt: result.checkedAt,
  });

  if (result.status === 'DOWN' && consecutiveFails === env.ALERT_FAILURE_THRESHOLD) {
    void sendDownAlertEmail({
      to: record.user.email,
      url: record.url,
      label: record.label,
      consecutiveFails,
      errorType: result.errorType,
      errorMessage: result.errorMessage,
      checkedAt: result.checkedAt,
    });
  }
}

let sweepInterval: ReturnType<typeof setInterval> | undefined;

export function startMonitoring(): void {
  registerJobHandler(handleCheckJob, env.MAX_CONCURRENT_CHECKS);

  void runScheduledSweep();
  sweepInterval = setInterval(() => {
    void runScheduledSweep();
  }, env.MONITOR_INTERVAL * 1000);

  logger.info(
    { event: 'monitor.started', concurrency: env.MAX_CONCURRENT_CHECKS, intervalSec: env.MONITOR_INTERVAL },
    'in-process monitoring runner started',
  );
}

export function stopMonitoring(): void {
  if (sweepInterval) clearInterval(sweepInterval);
}

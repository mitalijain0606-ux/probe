import { logger } from '../logger/logger.js';
import { findAllActive } from '../modules/urls/repository/url.repository.js';
import { enqueueJob } from './job-queue.js';

export async function runScheduledSweep(): Promise<{ enqueued: number }> {
  const activeUrls = await findAllActive();

  if (activeUrls.length === 0) {
    logger.info({ event: 'scheduler.sweep_skipped', reason: 'no_active_urls' }, 'no active urls to sweep');
    return { enqueued: 0 };
  }

  for (const target of activeUrls) {
    enqueueJob({ urlId: target.id, url: target.url, triggeredBy: 'schedule' });
  }

  logger.info(
    { event: 'scheduler.sweep_completed', totalActive: activeUrls.length, enqueued: activeUrls.length },
    'scheduled sweep enqueued checks',
  );

  return { enqueued: activeUrls.length };
}

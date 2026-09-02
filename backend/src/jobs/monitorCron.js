const cron = require('node-cron');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { checkMultipleUrlsConcurrently } = require('../services/healthCheckService');

let cronTask = null;
let isJobRunning = false;

/**
 * Initializes the node-cron scheduler to check active URLs.
 * Runs once every minute (* * * * *).
 */
function startMonitoringScheduler() {
  if (cronTask) {
    logger.warn({ event: 'cron_scheduler_already_running' });
    return cronTask;
  }

  logger.info({
    event: 'cron_scheduler_initialized',
    schedule: '* * * * * (every minute)',
  });

  cronTask = cron.schedule('* * * * *', async () => {
    // Prevent overlapping execution if a prior batch is taking longer
    if (isJobRunning) {
      logger.warn({ event: 'cron_job_skipped_previous_still_running' });
      return;
    }

    isJobRunning = true;
    const now = new Date();

    try {
      // 1. Fetch all active monitored URLs with user info and last check result
      const activeUrls = await prisma.monitoredURL.findMany({
        where: { isActive: true },
        include: {
          user: { select: { email: true } },
          checkResults: {
            orderBy: { checkedAt: 'desc' },
            take: 1,
          },
        },
      });

      if (activeUrls.length === 0) {
        isJobRunning = false;
        return;
      }

      // 2. Filter URLs that are due for a health check
      const urlsDueForCheck = activeUrls.filter(item => {
        const lastCheck = item.checkResults[0];
        if (!lastCheck) return true; // Never checked yet

        const elapsedMs = now.getTime() - new Date(lastCheck.checkedAt).getTime();
        const intervalMs = (item.checkInterval || 5) * 60 * 1000;
        return elapsedMs >= intervalMs;
      });

      if (urlsDueForCheck.length === 0) {
        isJobRunning = false;
        return;
      }

      logger.info({
        event: 'scheduled_check_batch_triggered',
        dueCount: urlsDueForCheck.length,
        totalActiveCount: activeUrls.length,
        timestamp: now.toISOString(),
      });

      // 3. Execute health checks concurrently using Promise.allSettled
      await checkMultipleUrlsConcurrently(urlsDueForCheck);

    } catch (err) {
      logger.error({
        event: 'scheduled_cron_error',
        error: err.message,
        stack: err.stack,
      });
    } finally {
      isJobRunning = false;
    }
  });

  return cronTask;
}

function stopMonitoringScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info({ event: 'cron_scheduler_stopped' });
  }
}

module.exports = {
  startMonitoringScheduler,
  stopMonitoringScheduler,
};

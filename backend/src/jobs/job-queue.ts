import { randomUUID } from 'node:crypto';
import { logger } from '../logger/logger.js';

export interface CheckJob {
  id: string;
  urlId: string;
  url: string;
  triggeredBy: 'manual' | 'schedule';
}

type JobHandler = (job: CheckJob) => Promise<void>;

const pending: CheckJob[] = [];
const inFlight = new Set<string>();
let handler: JobHandler | null = null;
let maxConcurrent = 1;
let draining = false;

export function registerJobHandler(fn: JobHandler, concurrency: number): void {
  handler = fn;
  maxConcurrent = Math.max(1, concurrency);
}

export function enqueueJob(input: { urlId: string; url: string; triggeredBy: 'manual' | 'schedule' }): CheckJob {
  const job: CheckJob = { id: randomUUID(), ...input };
  pending.push(job);
  logger.info(
    { event: 'queue.job_enqueued', jobId: job.id, urlId: job.urlId, triggeredBy: job.triggeredBy },
    'health check job enqueued',
  );
  void drain();
  return job;
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;

  try {
    while (pending.length > 0 && inFlight.size < maxConcurrent) {
      const job = pending.shift();
      if (!job || !handler) break;

      inFlight.add(job.id);
      const activeHandler = handler;

      void activeHandler(job)
        .catch((error: unknown) => {
          logger.error(
            { event: 'queue.job_failed', jobId: job.id, urlId: job.urlId, message: (error as Error).message },
            'job failed, queue continues processing other jobs',
          );
        })
        .finally(() => {
          inFlight.delete(job.id);
          void drain();
        });
    }
  } finally {
    draining = false;
  }
}

export function queueDepth(): number {
  return pending.length + inFlight.size;
}

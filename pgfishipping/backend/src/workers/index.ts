import type { Worker } from 'bullmq';
import { createTrackingWorker, scheduleTrackingPoll } from './tracking.worker';
import {
  createWeeklySummaryWorker,
  scheduleWeeklySummary,
} from './weeklySummary.worker';
import {
  createExchangeRateWorker,
  scheduleExchangeRate,
} from './exchangeRate.worker';
import {
  createSupportRetentionWorker,
  scheduleSupportRetention,
} from './chatRetention.worker';
import { isRedisAvailable, closeQueueConnection } from '../queues/connection';
import { closeAllQueues } from '../queues/queues';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let activeWorkers: Worker[] = [];
let started = false;

export async function startWorkers(): Promise<{ started: boolean; reason?: string }> {
  if (started) return { started: true };
  if (!env.JOBS_ENABLED) return { started: false, reason: 'JOBS_ENABLED=false' };

  const ok = await isRedisAvailable();
  if (!ok) {
    logger.warn('Redis unavailable; skipping workers');
    return { started: false, reason: 'redis-unavailable' };
  }

  activeWorkers = [
    createTrackingWorker(),
    createWeeklySummaryWorker(),
    createExchangeRateWorker(),
    createSupportRetentionWorker(),
  ];

  await Promise.all([
    scheduleTrackingPoll(),
    scheduleWeeklySummary(),
    scheduleExchangeRate(),
    scheduleSupportRetention(),
  ]);

  started = true;
  logger.info(
    { workers: activeWorkers.map((w) => w.name) },
    'Background workers started',
  );
  return { started: true };
}

export async function stopWorkers(): Promise<void> {
  if (!started) return;
  await Promise.all(activeWorkers.map((w) => w.close().catch(() => undefined)));
  activeWorkers = [];
  await closeAllQueues();
  await closeQueueConnection();
  started = false;
  logger.info('Background workers stopped');
}

import { Queue, type JobsOptions } from 'bullmq';
import { getQueueConnection } from './connection';
import { logger } from '../utils/logger';

export const QUEUE_NAMES = {
  trackingPoll: 'tracking-poll',
  weeklySummary: 'weekly-summary',
  exchangeRate: 'exchange-rate-refresh',
} as const;

const DEFAULT_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

let trackingPollQueue: Queue | null = null;
let weeklySummaryQueue: Queue | null = null;
let exchangeRateQueue: Queue | null = null;

export function getTrackingPollQueue(): Queue {
  if (!trackingPollQueue) {
    trackingPollQueue = new Queue(QUEUE_NAMES.trackingPoll, {
      connection: getQueueConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTS,
    });
  }
  return trackingPollQueue;
}

export function getWeeklySummaryQueue(): Queue {
  if (!weeklySummaryQueue) {
    weeklySummaryQueue = new Queue(QUEUE_NAMES.weeklySummary, {
      connection: getQueueConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTS,
    });
  }
  return weeklySummaryQueue;
}

export function getExchangeRateQueue(): Queue {
  if (!exchangeRateQueue) {
    exchangeRateQueue = new Queue(QUEUE_NAMES.exchangeRate, {
      connection: getQueueConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTS,
    });
  }
  return exchangeRateQueue;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(
    [trackingPollQueue, weeklySummaryQueue, exchangeRateQueue]
      .filter((q): q is Queue => q != null)
      .map(async (q) => {
        try {
          await q.close();
        } catch (err) {
          logger.warn({ err }, 'queue close failed');
        }
      }),
  );
  trackingPollQueue = null;
  weeklySummaryQueue = null;
  exchangeRateQueue = null;
}

// ─── Public enqueue helpers (used by app code) ──────────────────────────────

export async function enqueueTrackingPollForShipment(
  shipmentId: string,
): Promise<void> {
  await getTrackingPollQueue().add(
    'poll-one',
    { shipmentId },
    { jobId: `track_${shipmentId}` },
  );
}

import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, getTrackingPollQueue } from '../queues/queues';
import { getQueueConnection } from '../queues/connection';
import { logger } from '../utils/logger';
import {
  listPollableShipments,
  syncShipmentTracking,
} from '../services/tracking.service';
import { env } from '../config/env';

interface JobData {
  shipmentId?: string;
}

export function createTrackingWorker(): Worker {
  const worker = new Worker<JobData>(
    QUEUE_NAMES.trackingPoll,
    async (job: Job<JobData>) => {
      if (job.name === 'poll-all') {
        const ids = await listPollableShipments();
        logger.info({ count: ids.length }, 'tracking-poll: enqueueing per-shipment polls');
        const queue = getTrackingPollQueue();
        await Promise.all(
          ids.map((id) =>
            queue.add('poll-one', { shipmentId: id }, { jobId: `track_${id}` }),
          ),
        );
        return { enqueued: ids.length };
      }
      if (job.name === 'poll-one' && job.data.shipmentId) {
        const changed = await syncShipmentTracking(job.data.shipmentId);
        return { changed };
      }
      return { skipped: true };
    },
    {
      connection: getQueueConnection(),
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    logger.warn({ err: err?.message, jobId: job?.id }, 'tracking-poll job failed');
  });
  return worker;
}

export async function scheduleTrackingPoll(): Promise<void> {
  const queue = getTrackingPollQueue();
  await queue.add(
    'poll-all',
    {},
    {
      repeat: { pattern: env.TRACKING_POLL_CRON },
      jobId: 'tracking-poll-all',
    },
  );
}

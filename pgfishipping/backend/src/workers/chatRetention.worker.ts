import { Worker } from 'bullmq';
import { QUEUE_NAMES, getSupportRetentionQueue } from '../queues/queues';
import { getQueueConnection } from '../queues/connection';
import { logger } from '../utils/logger';
import { purgeExpiredSupportChats } from '../services/support/chat-retention.service';

export function createSupportRetentionWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.supportRetention,
    async () => {
      const result = await purgeExpiredSupportChats();
      logger.info({ ...result }, 'support-retention cleanup completed');
      return result;
    },
    {
      connection: getQueueConnection(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, err) => {
    logger.warn({ err: err?.message, jobId: job?.id }, 'support-retention job failed');
  });
  return worker;
}

export async function scheduleSupportRetention(): Promise<void> {
  const queue = getSupportRetentionQueue();
  await queue.add(
    'cleanup',
    {},
    {
      repeat: { pattern: '0 3 * * *' },
      jobId: 'support-retention-cleanup',
    },
  );
}

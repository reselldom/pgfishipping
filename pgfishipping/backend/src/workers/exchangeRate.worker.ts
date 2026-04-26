import { Worker } from 'bullmq';
import { QUEUE_NAMES, getExchangeRateQueue } from '../queues/queues';
import { getQueueConnection } from '../queues/connection';
import { logger } from '../utils/logger';
import {
  clearRateCache,
  getUsdToHtgRate,
} from '../services/exchangeRate.service';
import { env } from '../config/env';

export function createExchangeRateWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.exchangeRate,
    async () => {
      clearRateCache();
      const rate = await getUsdToHtgRate();
      logger.info({ rate }, 'exchange-rate refreshed');
      return { rate };
    },
    {
      connection: getQueueConnection(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, err) => {
    logger.warn({ err: err?.message, jobId: job?.id }, 'exchange-rate job failed');
  });
  return worker;
}

export async function scheduleExchangeRate(): Promise<void> {
  const queue = getExchangeRateQueue();
  await queue.add(
    'refresh',
    {},
    {
      repeat: { pattern: env.EXCHANGE_RATE_REFRESH_CRON },
      jobId: 'exchange-rate-refresh',
    },
  );
}

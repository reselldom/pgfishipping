import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, getWeeklySummaryQueue } from '../queues/queues';
import { getQueueConnection } from '../queues/connection';
import { logger } from '../utils/logger';
import {
  listSummaryRecipients,
  sendUserWeeklySummary,
} from '../services/summary.service';
import { env } from '../config/env';

interface JobData {
  userId?: string;
}

export function createWeeklySummaryWorker(): Worker {
  const worker = new Worker<JobData>(
    QUEUE_NAMES.weeklySummary,
    async (job: Job<JobData>) => {
      if (job.name === 'fanout') {
        const ids = await listSummaryRecipients();
        logger.info({ count: ids.length }, 'weekly-summary: fanning out');
        const queue = getWeeklySummaryQueue();
        await Promise.all(
          ids.map((userId) =>
            queue.add(
              'send-one',
              { userId },
              { jobId: `summary_${userId}_${currentWeekKey()}` },
            ),
          ),
        );
        return { enqueued: ids.length };
      }
      if (job.name === 'send-one' && job.data.userId) {
        const sent = await sendUserWeeklySummary(job.data.userId);
        return { sent };
      }
      return { skipped: true };
    },
    {
      connection: getQueueConnection(),
      concurrency: 10,
    },
  );

  worker.on('failed', (job, err) => {
    logger.warn({ err: err?.message, jobId: job?.id }, 'weekly-summary job failed');
  });
  return worker;
}

function currentWeekKey(): string {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

export async function scheduleWeeklySummary(): Promise<void> {
  const queue = getWeeklySummaryQueue();
  await queue.add(
    'fanout',
    {},
    {
      repeat: { pattern: env.WEEKLY_SUMMARY_CRON },
      jobId: 'weekly-summary-fanout',
    },
  );
}

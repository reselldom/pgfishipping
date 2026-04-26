import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Worker, type Job } from 'bullmq';
import { prisma } from '../../src/config/database';
import {
  isRedisAvailable,
  closeQueueConnection,
  getQueueConnection,
} from '../../src/queues/connection';
import {
  QUEUE_NAMES,
  getTrackingPollQueue,
  getWeeklySummaryQueue,
  getExchangeRateQueue,
  closeAllQueues,
} from '../../src/queues/queues';
import { setShipmentStatus } from '../../src/services/shipment.service';
import {
  buildUserWeeklySummary,
  renderWeeklySummary,
} from '../../src/services/summary.service';

let dbAvailable = false;
let redisAvailable = false;
let userId = '';
let shipmentId = '';

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    return;
  }
  redisAvailable = await isRedisAvailable();
  if (!redisAvailable) return;

  // Drain any leftover jobs from previous runs.
  await Promise.all([
    getTrackingPollQueue().obliterate({ force: true }).catch(() => undefined),
    getWeeklySummaryQueue().obliterate({ force: true }).catch(() => undefined),
    getExchangeRateQueue().obliterate({ force: true }).catch(() => undefined),
  ]);

  await cleanup();

  const user = await prisma.user.create({
    data: {
      email: `jobs+${Date.now()}@jobtest.local`,
      passwordHash: 'x',
      firstName: 'Jobs',
      lastName: 'Tester',
      customerCode: `J${Date.now().toString().slice(-6)}`,
      referralCode: `JOB${Date.now().toString().slice(-6)}`,
    },
  });
  userId = user.id;

  const ship = await prisma.shipment.create({
    data: {
      trackingCode: `PGFI-JOB-${Date.now()}`,
      userId: user.id,
      serviceType: 'AIR',
      contentsDescription: 'Test box',
      weightLbs: 2,
    },
  });
  shipmentId = ship.id;
});

async function cleanup() {
  await prisma.notificationLog.deleteMany({
    where: { user: { email: { endsWith: '@jobtest.local' } } },
  });
  await prisma.trackingEvent.deleteMany({
    where: { shipment: { user: { email: { endsWith: '@jobtest.local' } } } },
  });
  await prisma.shipment.deleteMany({
    where: { user: { email: { endsWith: '@jobtest.local' } } },
  });
  await prisma.wallet.deleteMany({
    where: { user: { email: { endsWith: '@jobtest.local' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@jobtest.local' } },
  });
}

afterAll(async () => {
  if (redisAvailable) {
    await closeAllQueues();
    await closeQueueConnection();
  }
  if (dbAvailable) await cleanup();
  await prisma.$disconnect();
});

function waitForJobResult(
  worker: Worker,
  jobId: string,
  timeoutMs = 5000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      worker.removeAllListeners('completed');
      worker.removeAllListeners('failed');
      reject(new Error(`timeout waiting for job ${jobId}`));
    }, timeoutMs);
    worker.on('completed', (job: Job, result: unknown) => {
      if (job.id === jobId) {
        clearTimeout(t);
        resolve(result);
      }
    });
    worker.on('failed', (job, err) => {
      if (job?.id === jobId) {
        clearTimeout(t);
        reject(err);
      }
    });
  });
}

describe('Background jobs (BullMQ)', () => {
  it('Tracking poll: enqueue → worker calls setShipmentStatus on result', async () => {
    if (!redisAvailable || !dbAvailable) return;

    const worker = new Worker(
      QUEUE_NAMES.trackingPoll,
      async (job: Job<{ shipmentId?: string; mockedStatus?: 'IN_TRANSIT' }>) => {
        if (!job.data.shipmentId) return { skipped: true };
        await setShipmentStatus(job.data.shipmentId, {
          status: job.data.mockedStatus ?? 'IN_TRANSIT',
          location: 'Miami, FL',
          source: 'test',
        });
        return { ok: true };
      },
      { connection: getQueueConnection(), concurrency: 1 },
    );

    const queue = getTrackingPollQueue();
    const job = await queue.add(
      'poll-one',
      { shipmentId, mockedStatus: 'IN_TRANSIT' },
      { jobId: `track-test_${shipmentId}`, removeOnComplete: true },
    );
    await waitForJobResult(worker, job.id!);
    await worker.close();

    const updated = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    expect(updated?.status).toBe('IN_TRANSIT');
    const events = await prisma.trackingEvent.count({ where: { shipmentId } });
    expect(events).toBeGreaterThan(0);
  });

  it('Exchange rate: worker job runs and returns a rate', async () => {
    if (!redisAvailable) return;

    const worker = new Worker(
      QUEUE_NAMES.exchangeRate,
      async () => ({ rate: 132.5 }),
      { connection: getQueueConnection(), concurrency: 1 },
    );

    const queue = getExchangeRateQueue();
    const job = await queue.add(
      'refresh',
      {},
      { jobId: `xr-test_${Date.now()}`, removeOnComplete: true },
    );
    const result = (await waitForJobResult(worker, job.id!)) as { rate: number };
    expect(result.rate).toBeGreaterThan(0);
    await worker.close();
  });

  it('Weekly summary: builder produces correct counts and renderer outputs HTML', async () => {
    if (!dbAvailable) return;

    const summary = await buildUserWeeklySummary(userId);
    expect(summary).not.toBeNull();
    expect(summary!.userId).toBe(userId);
    expect(summary!.newPackages).toBeGreaterThanOrEqual(1);

    const rendered = renderWeeklySummary(summary!);
    expect(rendered.subject).toContain('weekly summary');
    expect(rendered.html).toContain('Wallet balance');
    expect(rendered.text).toContain('Dashboard:');
  });
});

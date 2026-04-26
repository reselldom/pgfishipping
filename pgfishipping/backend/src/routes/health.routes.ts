import { Router } from 'express';
import { prisma } from '../config/database';
import { ok } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const startedAt = Date.now();
    let dbOk = false;
    let dbLatencyMs: number | null = null;
    try {
      const t0 = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - t0;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    ok(res, {
      status: dbOk ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: { database: { ok: dbOk, latencyMs: dbLatencyMs } },
      latencyMs: Date.now() - startedAt,
    });
  }),
);

export default router;

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';
import {
  getDashboardStats,
  getRevenueLast30Days,
} from '../../services/admin/analytics.service';

const router = Router();

router.get(
  '/dashboard',
  asyncHandler(async (_req: Request, res: Response) => ok(res, await getDashboardStats())),
);

router.get(
  '/revenue/last-30-days',
  asyncHandler(async (_req: Request, res: Response) => ok(res, await getRevenueLast30Days())),
);

export default router;

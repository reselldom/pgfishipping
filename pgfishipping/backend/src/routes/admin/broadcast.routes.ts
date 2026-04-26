import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/response';
import { requireRole } from '../../middleware/auth';
import {
  previewBroadcastRecipients,
  sendBroadcast,
} from '../../services/admin/broadcast.service';

const router = Router();

const broadcastSchema = z.object({
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  segment: z.enum(['all', 'active', 'verified', 'with-balance']).optional(),
  customerIds: z.array(z.string()).optional(),
});

router.post(
  '/preview',
  validate({ body: broadcastSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await previewBroadcastRecipients(req.body));
  }),
);

router.post(
  '/send',
  requireRole('SUPER_ADMIN', 'MANAGER'),
  validate({ body: broadcastSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await sendBroadcast(req.body));
  }),
);

export default router;

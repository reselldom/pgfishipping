import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { Errors, ok } from '../utils/response';
import { confirmDeposit, failDeposit } from '../services/wallet.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const router = Router();

const webhookSchema = z.object({
  reference: z.string().min(1),
  status: z.enum(['success', 'failed']),
  amount: z.number().nonnegative().optional(),
  reason: z.string().optional(),
});

function verifySharedSecret(req: Request): void {
  const provided =
    (req.headers['x-webhook-secret'] as string | undefined) ??
    (req.query.secret as string | undefined);
  if (!provided || provided !== env.WEBHOOK_SHARED_SECRET) {
    throw Errors.unauthorized('Invalid webhook secret');
  }
}

async function handleProviderWebhook(
  provider: string,
  req: Request,
  res: Response,
): Promise<void> {
  verifySharedSecret(req);
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    throw Errors.badRequest('Invalid webhook payload');
  }
  const { reference, status, reason } = parsed.data;
  logger.info({ provider, reference, status }, 'Provider webhook received');

  if (status === 'success') {
    const tx = await confirmDeposit(reference);
    ok(res, { transactionId: tx.id, status: tx.status });
    return;
  }
  await failDeposit(reference, reason ?? 'Unknown failure');
  ok(res, { reference, status: 'failed' });
}

router.post(
  '/moncash',
  asyncHandler((req, res) => handleProviderWebhook('moncash', req, res)),
);
router.post(
  '/natcash',
  asyncHandler((req, res) => handleProviderWebhook('natcash', req, res)),
);
router.post(
  '/paymon',
  asyncHandler((req, res) => handleProviderWebhook('paymon', req, res)),
);

export default router;

import { Router } from 'express';
import * as ctrl from '../controllers/wallet.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get(
  '/balance',
  validate({ query: ctrl.balanceQuerySchema }),
  asyncHandler(ctrl.balance),
);
router.post(
  '/deposit',
  validate({ body: ctrl.depositSchema }),
  asyncHandler(ctrl.deposit),
);
router.post(
  '/redeem-gift-card',
  validate({ body: ctrl.giftCardSchema }),
  asyncHandler(ctrl.redeem),
);
router.post(
  '/pay-shipment',
  validate({ body: ctrl.paySchema }),
  asyncHandler(ctrl.pay),
);

export default router;

import { Router } from 'express';
import * as ctrl from '../controllers/calculator.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/estimate',
  validate({ body: ctrl.estimateSchema }),
  asyncHandler(ctrl.estimateCtl),
);
router.get('/rates', asyncHandler(ctrl.ratesCtl));
router.get('/exchange-rate', asyncHandler(ctrl.exchangeRateCtl));

export default router;

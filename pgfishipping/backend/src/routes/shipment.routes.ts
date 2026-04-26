import { Router } from 'express';
import * as ctrl from '../controllers/shipment.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { invoiceUpload } from '../middleware/upload';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: ctrl.listSchema }), asyncHandler(ctrl.list));

router.post(
  '/pre-alert',
  validate({ body: ctrl.preAlertSchema }),
  asyncHandler(ctrl.preAlert),
);

router.post(
  '/merge',
  validate({ body: ctrl.mergeSchema }),
  asyncHandler(ctrl.merge),
);

router.get('/:id', asyncHandler(ctrl.detail));

router.put(
  '/:id/fob',
  validate({ body: ctrl.fobSchema }),
  asyncHandler(ctrl.fob),
);

router.post(
  '/:id/invoice',
  invoiceUpload.single('file'),
  asyncHandler(ctrl.uploadInvoice),
);

router.get('/:id/invoice', asyncHandler(ctrl.downloadInvoice));

router.post(
  '/:id/authorize',
  validate({ body: ctrl.thirdPartyAuthSchema }),
  asyncHandler(ctrl.thirdPartyPost),
);

router.get('/:id/authorize', asyncHandler(ctrl.thirdPartyGet));

router.get('/:id/label', asyncHandler(ctrl.label));

export default router;

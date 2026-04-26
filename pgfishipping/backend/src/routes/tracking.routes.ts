import { Router } from 'express';
import * as ctrl from '../controllers/shipment.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/:code', asyncHandler(ctrl.trackPublic));
router.get('/:code/events', asyncHandler(ctrl.trackEventsPublic));

export default router;

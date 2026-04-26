import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import customers from './customers.routes';
import shipments from './shipments.routes';
import resources from './resources.routes';
import staff from './staff.routes';
import analytics from './analytics.routes';
import broadcast from './broadcast.routes';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.use('/customers', customers);
router.use('/shipments', shipments);
router.use('/staff', staff);
router.use('/analytics', analytics);
router.use('/broadcast', broadcast);
router.use('/', resources);

export default router;

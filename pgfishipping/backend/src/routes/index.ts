import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import userRoutes from './user.routes';
import shipmentRoutes from './shipment.routes';
import trackingRoutes from './tracking.routes';
import calculatorRoutes from './calculator.routes';
import walletRoutes from './wallet.routes';
import webhookRoutes from './webhook.routes';
import adminRoutes from './admin';
import publicRoutes from './public.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/track', trackingRoutes);
router.use('/calculator', calculatorRoutes);
router.use('/wallet', walletRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin', adminRoutes);

export default router;

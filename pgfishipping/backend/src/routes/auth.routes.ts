import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { authLoginLimiter, forgotPasswordLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post(
  '/register',
  validate({ body: ctrl.registerSchema }),
  asyncHandler(ctrl.register),
);

router.post(
  '/login',
  authLoginLimiter,
  validate({ body: ctrl.loginSchema }),
  asyncHandler(ctrl.login),
);

router.post('/logout', asyncHandler(ctrl.logout));

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: ctrl.forgotSchema }),
  asyncHandler(ctrl.forgotPassword),
);

router.post(
  '/reset-password',
  validate({ body: ctrl.resetSchema }),
  asyncHandler(ctrl.resetPassword),
);

router.post(
  '/verify-email',
  validate({ body: ctrl.verifySchema }),
  asyncHandler(ctrl.verify),
);

router.post(
  '/resend-verification',
  validate({ body: ctrl.resendVerifySchema }),
  asyncHandler(ctrl.resendVerification),
);

router.post(
  '/refresh',
  validate({ body: ctrl.refreshSchema }),
  asyncHandler(ctrl.refresh),
);

router.put(
  '/change-password',
  requireAuth,
  validate({ body: ctrl.changePasswordSchema }),
  asyncHandler(ctrl.changePasswordCtl),
);

export default router;

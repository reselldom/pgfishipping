import { Router } from 'express';
import * as ctrl from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { profilePhotoUpload, idDocUpload } from '../middleware/upload';

const router = Router();

router.use(requireAuth);

router.get('/me', asyncHandler(ctrl.me));

router.put(
  '/profile',
  validate({ body: ctrl.updateProfileSchema }),
  asyncHandler(ctrl.updateMyProfile),
);

router.post(
  '/photo',
  profilePhotoUpload.single('file'),
  asyncHandler(ctrl.uploadProfilePhoto),
);

router.post(
  '/id-photo',
  idDocUpload.single('file'),
  asyncHandler(ctrl.uploadIdPhoto),
);

router.get('/address', asyncHandler(ctrl.myAddress));
router.get('/data', asyncHandler(ctrl.exportData));
router.delete('/account', asyncHandler(ctrl.deleteAccount));

export default router;

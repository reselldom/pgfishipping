import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { getPublicFooterContent, getPublicSocialLinks } from '../services/public/site.service';

const router = Router();

router.get(
  '/social-links',
  asyncHandler(async (_req, res) => {
    ok(res, await getPublicSocialLinks());
  }),
);

router.get(
  '/footer',
  asyncHandler(async (_req, res) => {
    ok(res, await getPublicFooterContent());
  }),
);

export default router;

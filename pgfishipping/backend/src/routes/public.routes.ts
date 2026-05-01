import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import {
  getPublicBrandingImages,
  getPublicFooterContent,
  getPublicHeroImage,
  getPublicSocialLinks,
  getPublicWarehouses,
} from '../services/public/site.service';

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

router.get(
  '/warehouses',
  asyncHandler(async (_req, res) => {
    ok(res, await getPublicWarehouses());
  }),
);

router.get(
  '/hero-image',
  asyncHandler(async (_req, res) => {
    ok(res, await getPublicHeroImage());
  }),
);

router.get(
  '/branding-images',
  asyncHandler(async (_req, res) => {
    ok(res, await getPublicBrandingImages());
  }),
);

export default router;

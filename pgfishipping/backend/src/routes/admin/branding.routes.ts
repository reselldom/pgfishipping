import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { ok, Errors } from '../../utils/response';
import { heroImageUpload } from '../../middleware/upload';
import { uploadFile } from '../../services/storage.service';
import {
  getPublicBrandingImages,
  parseBrandingSlot,
  setBrandingImageUrl,
} from '../../services/public/site.service';

const router = Router();

// ─── List all slots ─────────────────────────────────────────────────────────

router.get(
  '/branding-images',
  asyncHandler(async (_req: Request, res: Response) => {
    ok(res, await getPublicBrandingImages());
  }),
);

// ─── Per-slot operations ────────────────────────────────────────────────────

const setUrlSchema = z.object({
  url: z.union([z.string().url(), z.literal('')]),
});

function requireSlot(req: Request): ReturnType<typeof parseBrandingSlot> {
  const slot = parseBrandingSlot(req.params.slot ?? '');
  if (!slot) throw Errors.badRequest('Invalid slot');
  return slot;
}

router.put(
  '/branding-images/:slot',
  validate({ body: setUrlSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const slot = requireSlot(req);
    if (!slot) return; // unreachable – requireSlot throws; here only for TS
    ok(res, await setBrandingImageUrl(slot, req.body.url));
  }),
);

router.delete(
  '/branding-images/:slot',
  asyncHandler(async (req: Request, res: Response) => {
    const slot = requireSlot(req);
    if (!slot) return;
    ok(res, await setBrandingImageUrl(slot, ''));
  }),
);

router.post(
  '/branding-images/:slot/upload',
  heroImageUpload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const slot = requireSlot(req);
    if (!slot) return;
    const file = req.file;
    if (!file) throw Errors.badRequest('File is required');
    const ext = (file.originalname.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'jpg').toLowerCase();
    const key = `branding/${slot}/${Date.now()}.${ext}`;
    const uploaded = await uploadFile({
      key,
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });
    ok(res, await setBrandingImageUrl(slot, uploaded.url), undefined, 201);
  }),
);

// ─── Backwards-compatible hero-only aliases (kept so older clients keep
//     working — they delegate to the slot=`hero` endpoints above). ──────────

router.get(
  '/hero-image',
  asyncHandler(async (_req: Request, res: Response) => {
    const all = await getPublicBrandingImages();
    ok(res, { url: all.hero.url });
  }),
);

router.put(
  '/hero-image',
  validate({ body: setUrlSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const r = await setBrandingImageUrl('hero', req.body.url);
    ok(res, { url: r.url });
  }),
);

router.delete(
  '/hero-image',
  asyncHandler(async (_req: Request, res: Response) => {
    const r = await setBrandingImageUrl('hero', '');
    ok(res, { url: r.url });
  }),
);

router.post(
  '/hero-image/upload',
  heroImageUpload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw Errors.badRequest('File is required');
    const ext = (file.originalname.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'jpg').toLowerCase();
    const key = `branding/hero/${Date.now()}.${ext}`;
    const uploaded = await uploadFile({
      key,
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });
    const r = await setBrandingImageUrl('hero', uploaded.url);
    ok(res, { url: r.url }, undefined, 201);
  }),
);

export default router;

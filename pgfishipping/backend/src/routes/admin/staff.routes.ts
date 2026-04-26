import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/response';
import { requireRole } from '../../middleware/auth';
import {
  listStaff,
  createStaff,
  updateStaff,
  deactivateStaff,
} from '../../services/admin/staff.service';

const router = Router();

router.use(requireRole('SUPER_ADMIN', 'MANAGER'));

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => ok(res, await listStaff())),
);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.nativeEnum(UserRole).refine((r) => r !== 'CUSTOMER', 'CUSTOMER is invalid'),
  warehouseId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

router.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await createStaff(req.body), undefined, 201);
  }),
);

const updateSchema = createSchema.partial().extend({ password: z.string().min(8).max(200).optional() });

router.patch(
  '/:id',
  validate({ body: updateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await updateStaff(req.params.id, req.body));
  }),
);

router.post(
  '/:id/deactivate',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await deactivateStaff(req.params.id));
  }),
);

export default router;

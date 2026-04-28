import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { UserStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { ok, paginated, Errors } from '../../utils/response';
import {
  listCustomers,
  getCustomerDetail,
  updateCustomerStatus,
  adjustWalletBalance,
  findCustomerForIntake,
  searchCustomersForIntake,
} from '../../services/admin/customers.service';

const router = Router();

const listSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/',
  validate({ query: listSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await listCustomers(req.query as z.infer<typeof listSchema>);
    paginated(res, result.items, result.page, result.pageSize, result.total);
  }),
);

const intakeLookupSchema = z.object({
  q: z.string().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

router.get(
  '/lookup',
  validate({ query: intakeLookupSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, limit } = req.query as unknown as z.infer<typeof intakeLookupSchema>;
    ok(res, await searchCustomersForIntake(q, limit ?? 8));
  }),
);

// Quick lookup by customer code (HT-XXXXXX) for the admin "Receive Package"
// intake form. Must be declared BEFORE `/:id` so it doesn't get shadowed.
router.get(
  '/by-code/:code',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await findCustomerForIntake(req.params.code));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await getCustomerDetail(req.params.id));
  }),
);

const statusSchema = z.object({ status: z.nativeEnum(UserStatus) });
router.patch(
  '/:id/status',
  validate({ body: statusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await updateCustomerStatus(req.params.id, req.body.status));
  }),
);

const adjustSchema = z.object({
  amountUsd: z.number().refine((n) => n !== 0, 'Amount cannot be zero'),
  reason: z.string().min(3).max(500),
});
router.post(
  '/:id/adjust-wallet',
  validate({ body: adjustSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const result = await adjustWalletBalance(
      req.params.id,
      req.body.amountUsd,
      req.body.reason,
      req.auth.userId,
    );
    ok(res, result, undefined, 201);
  }),
);

export default router;

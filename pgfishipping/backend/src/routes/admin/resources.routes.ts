import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ServiceType, GiftCardStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { ok, paginated } from '../../utils/response';
import {
  listPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  issueGiftCard,
  listGiftCards,
  voidGiftCard,
  listTickets,
  getTicket,
  replyTicket,
  closeTicket,
  listSystemConfig,
  setSystemConfig,
  deleteSystemConfig,
} from '../../services/admin/resources.service';

const router = Router();

// ─── Pricing rules ──────────────────────────────────────────────────────────

const pricingSchema = z.object({
  name: z.string().min(1).max(100),
  serviceType: z.nativeEnum(ServiceType),
  feeType: z.string().min(1).max(50),
  ratePerLb: z.number().nullable().optional(),
  flatFee: z.number().nullable().optional(),
  minCharge: z.number().nullable().optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
});

router.get('/pricing', asyncHandler(async (_req, res) => ok(res, await listPricingRules())));
router.post(
  '/pricing',
  validate({ body: pricingSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await createPricingRule(req.body), undefined, 201);
  }),
);
router.patch(
  '/pricing/:id',
  validate({ body: pricingSchema.partial() }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await updatePricingRule(req.params.id, req.body));
  }),
);
router.delete(
  '/pricing/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await deletePricingRule(req.params.id);
    ok(res, { deleted: true });
  }),
);

// ─── Warehouses ─────────────────────────────────────────────────────────────

const warehouseSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  state: z.string().nullable().optional(),
  country: z.string().min(2).max(2),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.get('/warehouses', asyncHandler(async (_req, res) => ok(res, await listWarehouses())));
router.post(
  '/warehouses',
  validate({ body: warehouseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await createWarehouse(req.body), undefined, 201);
  }),
);
router.patch(
  '/warehouses/:id',
  validate({ body: warehouseSchema.partial() }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await updateWarehouse(req.params.id, req.body));
  }),
);
router.delete(
  '/warehouses/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await deleteWarehouse(req.params.id);
    ok(res, { deleted: true });
  }),
);

// ─── Gift cards ─────────────────────────────────────────────────────────────

const giftIssueSchema = z.object({
  valueUsd: z.number().positive(),
  issuedTo: z.string().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

router.post(
  '/gift-cards',
  validate({ body: giftIssueSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await issueGiftCard(req.body), undefined, 201);
  }),
);

const giftListSchema = z.object({
  status: z.nativeEnum(GiftCardStatus).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/gift-cards',
  validate({ query: giftListSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await listGiftCards(req.query as z.infer<typeof giftListSchema>);
    paginated(res, result.items, result.page, result.pageSize, result.total);
  }),
);

router.post(
  '/gift-cards/:id/void',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await voidGiftCard(req.params.id));
  }),
);

// ─── Support tickets ────────────────────────────────────────────────────────

const ticketsListSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/tickets',
  validate({ query: ticketsListSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await listTickets(req.query as z.infer<typeof ticketsListSchema>);
    paginated(res, result.items, result.page, result.pageSize, result.total);
  }),
);

router.get(
  '/tickets/:id',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await getTicket(req.params.id));
  }),
);

const replySchema = z.object({
  reply: z.string().min(1).max(5000),
  assignedTo: z.string().optional(),
});

router.post(
  '/tickets/:id/reply',
  validate({ body: replySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await replyTicket(req.params.id, req.body.reply, req.body.assignedTo));
  }),
);

router.post(
  '/tickets/:id/close',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await closeTicket(req.params.id));
  }),
);

// ─── System config ──────────────────────────────────────────────────────────

const configSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(2000),
});

router.get('/config', asyncHandler(async (_req, res) => ok(res, await listSystemConfig())));
router.put(
  '/config',
  validate({ body: configSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await setSystemConfig(req.body.key, req.body.value));
  }),
);
router.delete(
  '/config/:key',
  asyncHandler(async (req: Request, res: Response) => {
    await deleteSystemConfig(req.params.key);
    ok(res, { deleted: true });
  }),
);

export default router;

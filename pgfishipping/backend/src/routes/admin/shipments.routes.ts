import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ShipmentStatus, ServiceType } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { ok, paginated } from '../../utils/response';
import {
  adminListShipments,
  adminGetShipment,
  adminUpdateShipment,
  adminAddTrackingEvent,
  adminBulkUpdateStatus,
} from '../../services/admin/shipments.service';

const router = Router();

const listSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(ShipmentStatus).optional(),
  serviceType: z.nativeEnum(ServiceType).optional(),
  customerCode: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/',
  validate({ query: listSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adminListShipments(req.query as z.infer<typeof listSchema>);
    paginated(res, result.items, result.page, result.pageSize, result.total);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminGetShipment(req.params.id));
  }),
);

const updateSchema = z.object({
  weightLbs: z.number().positive().optional(),
  dimensionLength: z.number().positive().optional(),
  dimensionWidth: z.number().positive().optional(),
  dimensionHeight: z.number().positive().optional(),
  contentsDescription: z.string().max(500).optional(),
  vendor: z.string().max(200).optional(),
  externalTracking: z.string().nullable().optional(),
  externalCarrier: z.string().nullable().optional(),
  destinationBranchId: z.string().nullable().optional(),
  originWarehouseId: z.string().nullable().optional(),
  fobValue: z.number().nullable().optional(),
  totalCost: z.number().nullable().optional(),
});

router.patch(
  '/:id',
  validate({ body: updateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminUpdateShipment(req.params.id, req.body));
  }),
);

const eventSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  label: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
});

router.post(
  '/:id/events',
  validate({ body: eventSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adminAddTrackingEvent(
      req.params.id,
      req.body.status,
      req.body.label,
      req.body.location,
    );
    ok(res, result, undefined, 201);
  }),
);

const bulkSchema = z.object({
  shipmentIds: z.array(z.string()).min(1).max(500),
  status: z.nativeEnum(ShipmentStatus),
  location: z.string().max(200).optional(),
});

router.post(
  '/bulk-status',
  validate({ body: bulkSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminBulkUpdateStatus(req.body));
  }),
);

export default router;

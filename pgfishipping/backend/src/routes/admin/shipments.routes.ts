import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ShipmentStatus, ServiceType, ContentType, SpecialFlag } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { ok, paginated, Errors } from '../../utils/response';
import { labelImageUpload } from '../../middleware/upload';
import type { DeliverySignerInput } from '../../services/shipment.service';
import {
  adminListShipments,
  adminGetShipment,
  adminUpdateShipment,
  adminAddTrackingEvent,
  adminBulkUpdateStatus,
  adminIntakeShipment,
  attachShipmentLabelImage,
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

const eventSchema = z
  .object({
    status: z.nativeEnum(ShipmentStatus),
    label: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
    deliveredSignerRole: z
      .enum(['ACCOUNT_HOLDER', 'AUTHORIZED_THIRD_PARTY', 'CUSTOM'])
      .optional(),
    deliveredSignerCustomName: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'DELIVERED') {
      if (!data.deliveredSignerRole) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select who received the package when marking as DELIVERED',
          path: ['deliveredSignerRole'],
        });
      }
      if (data.deliveredSignerRole === 'CUSTOM') {
        if (!data.deliveredSignerCustomName?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter the recipient name for "Other recipient"',
            path: ['deliveredSignerCustomName'],
          });
        }
      }
    }
  });

router.post(
  '/:id/events',
  validate({ body: eventSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof eventSchema>;
    const deliverySigner: DeliverySignerInput | undefined =
      body.status === 'DELIVERED' && body.deliveredSignerRole
        ? { role: body.deliveredSignerRole, customName: body.deliveredSignerCustomName }
        : undefined;
    const result = await adminAddTrackingEvent(
      req.params.id,
      body.status,
      body.label,
      body.location,
      'admin',
      deliverySigner,
    );
    ok(res, result, undefined, 201);
  }),
);

// ─── Receive Package (admin intake) ─────────────────────────────────────────
//
// Two intake modes:
//   1. JSON only: POST /admin/shipments/intake with application/json body.
//   2. With label photo: POST /admin/shipments/intake as multipart/form-data
//      where one field "data" is the JSON payload and one optional file
//      "labelImage" is the photo of the package label.
//
// Both modes accept the same payload schema below.

const intakeSchema = z
  .object({
    customerCode: z.string().trim().min(1).optional(),
    userId: z.string().trim().min(1).optional(),
    serviceType: z.nativeEnum(ServiceType),
    contentType: z.nativeEnum(ContentType).optional(),
    externalTracking: z.string().trim().max(120).optional(),
    externalCarrier: z.string().trim().max(80).optional(),
    contentsDescription: z.string().trim().max(500).optional(),
    vendor: z.string().trim().max(200).optional(),
    weightLbs: z.number().positive().max(2000).optional(),
    dimensionLength: z.number().positive().optional(),
    dimensionWidth: z.number().positive().optional(),
    dimensionHeight: z.number().positive().optional(),
    fobValue: z.number().nonnegative().optional(),
    fobCurrency: z.enum(['USD', 'EUR']).optional(),
    specialFlags: z.array(z.nativeEnum(SpecialFlag)).optional(),
    recipientName: z.string().trim().max(200).optional(),
    recipientPhone: z.string().trim().max(40).optional(),
    originWarehouseId: z.string().trim().min(1).optional(),
    destinationBranchId: z.string().trim().min(1).optional(),
    additionalNotes: z.string().trim().max(2000).optional(),
    initialStatus: z.enum(['WAITING', 'RECEIVED']).optional(),
    location: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.customerCode || v.userId, {
    message: 'customerCode or userId is required',
    path: ['customerCode'],
  });

router.post(
  '/intake',
  labelImageUpload.single('labelImage'),
  asyncHandler(async (req: Request, res: Response) => {
    // When sent as multipart/form-data, the JSON payload comes in the "data" field.
    let raw: unknown = req.body;
    if (typeof req.body?.data === 'string') {
      try {
        raw = JSON.parse(req.body.data);
      } catch {
        throw Errors.badRequest('Invalid JSON in "data" field');
      }
    }
    const parsed = intakeSchema.safeParse(raw);
    if (!parsed.success) {
      throw Errors.badRequest(
        parsed.error.issues.map((i) => i.message).join('; '),
      );
    }
    const file = req.file;
    const result = await adminIntakeShipment(
      parsed.data,
      req.auth?.userId,
      file ? { buffer: file.buffer, mimetype: file.mimetype } : undefined,
    );
    ok(res, result, undefined, 201);
  }),
);

router.post(
  '/:id/label-image',
  labelImageUpload.single('labelImage'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw Errors.badRequest('labelImage file is required');
    ok(
      res,
      await attachShipmentLabelImage(req.params.id, {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
      }),
    );
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

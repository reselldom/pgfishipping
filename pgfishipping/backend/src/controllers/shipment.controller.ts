import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  ContentType,
  ServiceType,
  ShipmentStatus,
  SpecialFlag,
} from '@prisma/client';
import { Errors, ok, paginated, created } from '../utils/response';
import {
  attachInvoice,
  createPreAlert,
  getShipmentForUser,
  getThirdPartyAuth,
  listMyShipments,
  mergeShipments,
  publicTrack,
  setThirdPartyAuth,
  updateFobValue,
} from '../services/shipment.service';
import { prisma } from '../config/database';
import { generateShippingLabelPdf } from '../services/pdf.service';

export const preAlertSchema = z.object({
  externalTracking: z.string().max(80).optional(),
  externalCarrier: z.string().max(40).optional(),
  serviceType: z.nativeEnum(ServiceType),
  contentType: z.nativeEnum(ContentType).optional(),
  contentsDescription: z.string().max(500).optional(),
  vendor: z.string().max(80).optional(),
  specialFlags: z.array(z.nativeEnum(SpecialFlag)).optional(),
  weightLbs: z.number().positive().max(2000).optional(),
  dimensionLength: z.number().positive().max(500).optional(),
  dimensionWidth: z.number().positive().max(500).optional(),
  dimensionHeight: z.number().positive().max(500).optional(),
  fobValue: z.number().nonnegative().optional(),
  fobCurrency: z.enum(['USD', 'EUR']).optional(),
  additionalNotes: z.string().max(1000).optional(),
  destinationBranchId: z.string().optional(),
  recipientName: z.string().max(120).optional(),
  recipientPhone: z.string().max(40).optional(),
  /** Haiti pickup — customer must choose department + city before creating a pre-alert. */
  haitiDepartmentKey: z.string().trim().min(2).max(40),
  haitiDeliveryCity: z.string().trim().min(1).max(80),
});

export const listSchema = z.object({
  status: z
    .union([
      z.nativeEnum(ShipmentStatus),
      z.enum(['PRE_ALERTS', 'ACTIVE', 'DELIVERED']),
    ])
    .optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const fobSchema = z.object({
  fobValue: z.number().nonnegative(),
  fobCurrency: z.enum(['USD', 'EUR']).optional(),
});

export const thirdPartyAuthSchema = z.object({
  authorizedName: z.string().min(1).max(120),
  idType: z.string().min(1).max(40),
  idNumber: z.string().min(1).max(80),
  phone: z.string().min(1).max(40),
});

export const mergeSchema = z.object({
  shipmentIds: z.array(z.string().min(1)).min(2).max(20),
});

export const publicTrackSchema = z.object({
  code: z.string().min(3).max(80),
});

export async function preAlert(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const body = req.body as z.infer<typeof preAlertSchema>;
  const shipment = await createPreAlert(req.auth.userId, body);
  created(res, shipment);
}

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const q = req.query as z.infer<typeof listSchema>;
  const result = await listMyShipments({
    userId: req.auth.userId,
    status: q.status,
    search: q.search,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.items, result.page, result.pageSize, result.total);
}

export async function detail(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const { id } = req.params as { id: string };
  const data = await getShipmentForUser(req.auth.userId, id);
  ok(res, data);
}

export async function fob(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const { id } = req.params as { id: string };
  const body = req.body as z.infer<typeof fobSchema>;
  const updated = await updateFobValue(
    req.auth.userId,
    id,
    body.fobValue,
    body.fobCurrency,
  );
  ok(res, updated);
}

export async function uploadInvoice(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  if (!req.file) throw Errors.badRequest('No file uploaded');
  const { id } = req.params as { id: string };
  const updated = await attachInvoice(req.auth.userId, id, req.file);
  ok(res, { invoiceUrl: updated.invoiceUrl });
}

export async function downloadInvoice(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const { id } = req.params as { id: string };
  const ship = await getShipmentForUser(req.auth.userId, id);
  if (!ship.invoiceUrl) throw Errors.notFound('No invoice on file');

  let remote: Awaited<ReturnType<typeof fetch>>;
  try {
    remote = await fetch(ship.invoiceUrl);
  } catch {
    throw Errors.badRequest('Failed to retrieve invoice');
  }
  if (!remote.ok) {
    throw Errors.badRequest(`Invoice storage returned HTTP ${remote.status}`);
  }

  const buf = Buffer.from(await remote.arrayBuffer());
  const ctRaw = (remote.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';

  let contentType = 'application/octet-stream';
  let ext = 'bin';
  if (ctRaw.includes('pdf')) {
    contentType = 'application/pdf';
    ext = 'pdf';
  } else if (ctRaw.includes('jpeg') || ctRaw.includes('jpg')) {
    contentType = 'image/jpeg';
    ext = 'jpg';
  } else if (ctRaw.includes('png')) {
    contentType = 'image/png';
    ext = 'png';
  } else if (ctRaw.includes('webp')) {
    contentType = 'image/webp';
    ext = 'webp';
  }

  const filename = `invoice-${ship.trackingCode}.${ext}`.replace(/[^\w.\-()+]/g, '_');

  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  res.send(buf);
}

export async function thirdPartyPost(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const { id } = req.params as { id: string };
  const body = req.body as z.infer<typeof thirdPartyAuthSchema>;
  const result = await setThirdPartyAuth(req.auth.userId, id, body);
  ok(res, result);
}

export async function thirdPartyGet(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const { id } = req.params as { id: string };
  const result = await getThirdPartyAuth(req.auth.userId, id);
  ok(res, result);
}

export async function merge(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const body = req.body as z.infer<typeof mergeSchema>;
  const result = await mergeShipments(req.auth.userId, body.shipmentIds);
  ok(res, result);
}

export async function label(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const { id } = req.params as { id: string };
  const ship = await getShipmentForUser(req.auth.userId, id);
  const user = await prisma.user.findUnique({ where: { id: ship.userId } });
  if (!user) throw Errors.notFound('User not found');
  const pdf = await generateShippingLabelPdf({
    trackingCode: ship.trackingCode,
    customerCode: user.customerCode,
    customerName: `${user.firstName} ${user.lastName}`,
    serviceType: ship.serviceType,
    weightLbs: ship.weightLbs,
    contentsDescription: ship.contentsDescription,
    destination: ship.destinationCountry,
    customerLanguage: user.language,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="label-${ship.trackingCode}.pdf"`,
  );
  res.send(pdf);
}

// ─── Public tracking ───────────────────────────────────────────────────────

export async function trackPublic(req: Request, res: Response): Promise<void> {
  const { code } = req.params as { code: string };
  const data = await publicTrack(code);
  ok(res, data);
}

export async function trackEventsPublic(
  req: Request,
  res: Response,
): Promise<void> {
  const { code } = req.params as { code: string };
  const data = await publicTrack(code);
  ok(res, { trackingCode: data.trackingCode, events: data.events });
}

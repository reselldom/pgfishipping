import {
  ContentType,
  DeliverySignerRole,
  Prisma,
  ServiceType,
  ShipmentStatus,
  SpecialFlag,
  type Shipment,
  type TrackingEvent,
} from '@prisma/client';
import { prisma } from '../config/database';
import { Errors } from '../utils/response';
import { generateTrackingCode } from '../utils/generateCode';
import { uploadFile } from './storage.service';
import {
  notifyShipmentStatus,
  notifyThirdPartyAuth,
} from './notifications.service';
import { logger } from '../utils/logger';
import { assertHaitiDeliveryAllowed } from './public/haiti-delivery.service';

export interface PreAlertInput {
  externalTracking?: string;
  externalCarrier?: string;
  serviceType: ServiceType;
  contentType?: ContentType;
  contentsDescription?: string;
  vendor?: string;
  specialFlags?: SpecialFlag[];
  weightLbs?: number;
  dimensionLength?: number;
  dimensionWidth?: number;
  dimensionHeight?: number;
  fobValue?: number;
  fobCurrency?: string;
  additionalNotes?: string;
  destinationBranchId?: string;
  recipientName?: string;
  recipientPhone?: string;
  haitiDepartmentKey?: string;
  haitiDeliveryCity?: string;
}

export async function createPreAlert(
  userId: string,
  input: PreAlertInput,
): Promise<Shipment> {
  const trackingCode = await allocateUniqueTrackingCode();

  const haiti = await assertHaitiDeliveryAllowed(
    input.haitiDepartmentKey,
    input.haitiDeliveryCity,
  );

  const shipment = await prisma.shipment.create({
    data: {
      trackingCode,
      userId,
      externalTracking: input.externalTracking?.trim() || null,
      externalCarrier: input.externalCarrier?.trim() || null,
      serviceType: input.serviceType,
      status: 'WAITING',
      contentType: input.contentType ?? 'PACKAGE',
      contentsDescription: input.contentsDescription ?? null,
      vendor: input.vendor ?? null,
      specialFlags: input.specialFlags ?? [],
      weightLbs: input.weightLbs ?? null,
      dimensionLength: input.dimensionLength ?? null,
      dimensionWidth: input.dimensionWidth ?? null,
      dimensionHeight: input.dimensionHeight ?? null,
      fobValue: input.fobValue ?? null,
      fobCurrency: input.fobCurrency ?? 'USD',
      additionalNotes: input.additionalNotes ?? null,
      destinationBranchId: input.destinationBranchId ?? null,
      recipientName: input.recipientName ?? null,
      recipientPhone: input.recipientPhone ?? null,
      haitiDepartmentKey: haiti.deptKey,
      haitiDeliveryCity: haiti.city,
    },
  });

  // Initial tracking event
  await prisma.trackingEvent.create({
    data: {
      shipmentId: shipment.id,
      status: 'WAITING',
      label: 'Pre-alert created — waiting for package at US warehouse',
    },
  });

  return shipment;
}

async function allocateUniqueTrackingCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateTrackingCode();
    const exists = await prisma.shipment.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw Errors.internal('Failed to generate unique tracking code');
}

export interface ListShipmentsOptions {
  userId: string;
  status?: ShipmentStatus | 'PRE_ALERTS' | 'ACTIVE' | 'DELIVERED';
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listMyShipments(opts: ListShipmentsOptions): Promise<{
  items: Shipment[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));

  const where: Prisma.ShipmentWhereInput = { userId: opts.userId };

  // Translate spec's 3-tab grouping to status filters.
  if (opts.status === 'PRE_ALERTS') {
    where.status = { in: ['WAITING'] };
  } else if (opts.status === 'ACTIVE') {
    where.status = {
      in: [
        'RECEIVED',
        'IN_TRANSIT',
        'IN_TRANSIT_B',
        'INVENTORY',
        'AVAILABLE',
      ],
    };
  } else if (opts.status === 'DELIVERED') {
    where.status = { in: ['DELIVERED', 'RETURNED', 'LOST', 'CANCELLED'] };
  } else if (opts.status) {
    where.status = opts.status as ShipmentStatus;
  }

  if (opts.search) {
    const s = opts.search.trim();
    where.OR = [
      { trackingCode: { contains: s, mode: 'insensitive' } },
      { externalTracking: { contains: s, mode: 'insensitive' } },
      { contentsDescription: { contains: s, mode: 'insensitive' } },
      { vendor: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shipment.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getShipmentForUser(
  userId: string,
  shipmentId: string,
): Promise<Shipment & { trackingEvents: TrackingEvent[]; thirdPartyAuth: unknown }> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      trackingEvents: { orderBy: { timestamp: 'desc' } },
      thirdPartyAuth: true,
    },
  });
  if (!shipment) throw Errors.notFound('Shipment not found');
  if (shipment.userId !== userId) {
    throw Errors.forbidden('You do not own this shipment');
  }
  return shipment;
}

export async function updateFobValue(
  userId: string,
  shipmentId: string,
  fobValue: number,
  fobCurrency = 'USD',
): Promise<Shipment> {
  await assertOwn(userId, shipmentId);
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: { fobValue, fobCurrency },
  });
}

export async function attachInvoice(
  userId: string,
  shipmentId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string },
): Promise<Shipment> {
  await assertOwn(userId, shipmentId);
  const ext = file.mimetype === 'application/pdf' ? 'pdf' : 'jpg';
  const key = `invoices/${shipmentId}/invoice.${ext}`;
  const result = await uploadFile({
    key,
    buffer: file.buffer,
    contentType: file.mimetype,
  });
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: { invoiceUrl: result.url },
  });
}

export interface ThirdPartyAuthInput {
  authorizedName: string;
  idType: string;
  idNumber: string;
  phone: string;
}

export async function setThirdPartyAuth(
  userId: string,
  shipmentId: string,
  input: ThirdPartyAuthInput,
): Promise<unknown> {
  await assertOwn(userId, shipmentId);
  const result = await prisma.thirdPartyAuth.upsert({
    where: { shipmentId },
    update: { ...input },
    create: { ...input, shipmentId, userId },
  });
  notifyThirdPartyAuth(shipmentId).catch((err) => {
    logger.warn({ err, shipmentId }, 'notifyThirdPartyAuth failed');
  });
  return result;
}

export async function getThirdPartyAuth(
  userId: string,
  shipmentId: string,
): Promise<unknown> {
  await assertOwn(userId, shipmentId);
  return prisma.thirdPartyAuth.findUnique({ where: { shipmentId } });
}

export async function mergeShipments(
  userId: string,
  shipmentIds: string[],
): Promise<{ mergeGroupId: string; count: number }> {
  if (shipmentIds.length < 2) {
    throw Errors.badRequest('At least two shipments required to merge');
  }
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: shipmentIds }, userId },
    select: { id: true },
  });
  if (shipments.length !== shipmentIds.length) {
    throw Errors.forbidden(
      'One or more shipments do not exist or are not owned by you',
    );
  }
  const mergeGroupId = `mg_${Date.now().toString(36)}`;
  await prisma.shipment.updateMany({
    where: { id: { in: shipmentIds } },
    data: { mergeGroupId },
  });
  return { mergeGroupId, count: shipments.length };
}

/** Passed when marking DELIVERED from admin (physical receiver / signature line). */
export interface DeliverySignerInput {
  role: 'ACCOUNT_HOLDER' | 'AUTHORIZED_THIRD_PARTY' | 'CUSTOM';
  customName?: string;
}

export interface SetStatusInput {
  status: ShipmentStatus;
  label?: string;
  location?: string;
  source?: string; // 'admin' | 'aftership' | 'system'
  /** Required for admin-delivered parcels when transitioning to DELIVERED. */
  deliverySigner?: DeliverySignerInput;
}

async function resolveDeliverySignerForShipment(
  shipmentId: string,
  signer: DeliverySignerInput,
): Promise<{ role: DeliverySignerRole; name: string }> {
  const s = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      user: { select: { firstName: true, lastName: true } },
      thirdPartyAuth: true,
    },
  });
  if (!s) throw Errors.notFound('Shipment not found');

  if (signer.role === 'ACCOUNT_HOLDER') {
    const name = `${s.user.firstName} ${s.user.lastName}`.trim();
    return { role: 'ACCOUNT_HOLDER', name: name || '(Account holder)' };
  }
  if (signer.role === 'AUTHORIZED_THIRD_PARTY') {
    const t = s.thirdPartyAuth;
    if (!t) {
      throw Errors.badRequest(
        'No third-party pickup is registered for this shipment. The customer must add authorization first.',
      );
    }
    return { role: 'AUTHORIZED_THIRD_PARTY', name: t.authorizedName };
  }
  const custom = signer.customName?.trim();
  if (!custom) {
    throw Errors.badRequest('Enter the receiver name when "Other recipient" is selected.');
  }
  return { role: 'CUSTOM', name: custom };
}

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  WAITING: 'Waiting for package at US warehouse',
  RECEIVED: 'Package received at US warehouse',
  IN_TRANSIT: 'In transit',
  IN_TRANSIT_B: 'In transit to local branch',
  INVENTORY: 'In inventory at destination',
  AVAILABLE: 'Ready for pickup',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  LOST: 'Lost',
  CANCELLED: 'Cancelled',
};

/**
 * Updates a shipment's status, records a tracking event, and fires the
 * appropriate customer notification email. Used by the admin API and by the
 * BullMQ tracking-poll job. Idempotent: same status twice = no-op.
 */
export async function setShipmentStatus(
  shipmentId: string,
  input: SetStatusInput,
): Promise<Shipment> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw Errors.notFound('Shipment not found');

  if (shipment.status === input.status) {
    return shipment;
  }

  const data: Prisma.ShipmentUpdateInput = { status: input.status };

  if (input.status !== 'DELIVERED') {
    data.deliveredSignerRole = null;
    data.deliveredSignerName = null;
  }

  let resolvedSigner: { role: DeliverySignerRole; name: string } | null = null;
  if (input.status === 'DELIVERED' && input.deliverySigner) {
    resolvedSigner = await resolveDeliverySignerForShipment(
      shipmentId,
      input.deliverySigner,
    );
    data.deliveredSignerRole = resolvedSigner.role;
    data.deliveredSignerName = resolvedSigner.name;
  }

  if (input.status === 'DELIVERED' && !shipment.deliveredAt) {
    data.deliveredAt = new Date();
  }

  const fallbackLabel = STATUS_LABEL[input.status];
  const eventLabel =
    input.label?.trim()
      ? input.label
      : input.status === 'DELIVERED' && resolvedSigner
        ? `${fallbackLabel} — Received by: ${resolvedSigner.name}`
        : fallbackLabel;

  const [updated] = await prisma.$transaction([
    prisma.shipment.update({ where: { id: shipmentId }, data }),
    prisma.trackingEvent.create({
      data: {
        shipmentId,
        status: input.status,
        label: eventLabel,
        location: input.location ?? null,
        notes: input.source ? `source:${input.source}` : null,
      },
    }),
  ]);

  notifyShipmentStatus(shipmentId, input.status).catch((err) => {
    logger.warn({ err, shipmentId, status: input.status }, 'notifyShipmentStatus failed');
  });

  return updated;
}

async function assertOwn(userId: string, shipmentId: string): Promise<void> {
  const s = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { userId: true },
  });
  if (!s) throw Errors.notFound('Shipment not found');
  if (s.userId !== userId) throw Errors.forbidden('Not your shipment');
}

// ─── Public tracking ───────────────────────────────────────────────────────

const FOUR_STEP: Record<string, number> = {
  WAITING: 0,
  RECEIVED: 1,
  IN_TRANSIT: 2,
  IN_TRANSIT_B: 2,
  INVENTORY: 2,
  AVAILABLE: 3,
  DELIVERED: 4,
  RETURNED: 4,
  LOST: 4,
  CANCELLED: 4,
};

export interface PublicTracking {
  trackingCode: string;
  externalTracking: string | null;
  externalCarrier: string | null;
  status: ShipmentStatus;
  step: number; // 0..4
  serviceType: ServiceType;
  originCountry: string;
  destinationCountry: string;
  contentsDescription: string | null;
  weightLbs: number | null;
  recipientName: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  events: Array<
    Pick<TrackingEvent, 'status' | 'label' | 'location' | 'timestamp'>
  >;
}

export async function publicTrack(code: string): Promise<PublicTracking> {
  const c = code.trim();
  // Try internal PG- code first, then external tracking number.
  let shipment = await prisma.shipment.findFirst({
    where: { trackingCode: c.toUpperCase() },
    include: { trackingEvents: { orderBy: { timestamp: 'desc' } } },
  });
  if (!shipment) {
    shipment = await prisma.shipment.findFirst({
      where: { externalTracking: c },
      include: { trackingEvents: { orderBy: { timestamp: 'desc' } } },
    });
  }
  if (!shipment) throw Errors.notFound('Tracking code not found');

  return {
    trackingCode: shipment.trackingCode,
    externalTracking: shipment.externalTracking,
    externalCarrier: shipment.externalCarrier,
    status: shipment.status,
    step: FOUR_STEP[shipment.status] ?? 0,
    serviceType: shipment.serviceType,
    originCountry: shipment.originCountry,
    destinationCountry: shipment.destinationCountry,
    contentsDescription: shipment.contentsDescription,
    weightLbs: shipment.weightLbs,
    recipientName: shipment.recipientName,
    createdAt: shipment.createdAt,
    deliveredAt: shipment.deliveredAt,
    events: shipment.trackingEvents.map((e) => ({
      status: e.status,
      label: e.label,
      location: e.location,
      timestamp: e.timestamp,
    })),
  };
}

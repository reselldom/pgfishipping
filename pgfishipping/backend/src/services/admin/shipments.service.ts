import {
  ContentType,
  Prisma,
  ShipmentStatus,
  ServiceType,
  SpecialFlag,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { Errors } from '../../utils/response';
import { setShipmentStatus, type DeliverySignerInput } from '../shipment.service';
import { generateTrackingCode } from '../../utils/generateCode';
import { uploadFile } from '../storage.service';
import { notifyShipmentStatus } from '../notifications.service';
import { logger } from '../../utils/logger';
import { assertHaitiDeliveryAllowed } from '../public/haiti-delivery.service';

export interface AdminListShipmentsInput {
  search?: string;
  status?: ShipmentStatus;
  serviceType?: ServiceType;
  customerCode?: string;
  page?: number;
  pageSize?: number;
}

export async function adminListShipments(input: AdminListShipmentsInput): Promise<{
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));

  const where: Prisma.ShipmentWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.serviceType ? { serviceType: input.serviceType } : {}),
    ...(input.customerCode
      ? { user: { customerCode: input.customerCode } }
      : {}),
    ...(input.search
      ? {
          OR: [
            { trackingCode: { contains: input.search, mode: 'insensitive' as const } },
            { externalTracking: { contains: input.search, mode: 'insensitive' as const } },
            { contentsDescription: { contains: input.search, mode: 'insensitive' as const } },
            { vendor: { contains: input.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        trackingCode: true,
        externalTracking: true,
        externalCarrier: true,
        status: true,
        serviceType: true,
        contentType: true,
        weightLbs: true,
        totalCost: true,
        paidAt: true,
        deliveredAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            customerCode: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.shipment.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function adminGetShipment(shipmentId: string): Promise<unknown> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      user: { select: { id: true, customerCode: true, email: true, firstName: true, lastName: true, phoneCell: true } },
      trackingEvents: { orderBy: { timestamp: 'desc' } },
      transactions: { orderBy: { createdAt: 'desc' } },
      thirdPartyAuth: true,
      destinationBranch: true,
      originWarehouse: true,
    },
  });
  if (!shipment) throw Errors.notFound('Shipment not found');
  return shipment;
}

export interface AdminUpdateShipmentInput {
  weightLbs?: number;
  dimensionLength?: number;
  dimensionWidth?: number;
  dimensionHeight?: number;
  contentsDescription?: string;
  vendor?: string;
  externalTracking?: string | null;
  externalCarrier?: string | null;
  destinationBranchId?: string | null;
  originWarehouseId?: string | null;
  fobValue?: number | null;
  totalCost?: number | null;
}

export async function adminUpdateShipment(
  shipmentId: string,
  input: AdminUpdateShipmentInput,
): Promise<unknown> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw Errors.notFound('Shipment not found');
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: input as Prisma.ShipmentUpdateInput,
  });
}

export async function adminAddTrackingEvent(
  shipmentId: string,
  status: ShipmentStatus,
  label?: string,
  location?: string,
  source = 'admin',
  deliverySigner?: DeliverySignerInput,
): Promise<unknown> {
  if (status === 'DELIVERED') {
    if (!deliverySigner) {
      throw Errors.badRequest(
        'Select who received the package when marking a shipment as delivered.',
      );
    }
    return setShipmentStatus(shipmentId, {
      status,
      label,
      location,
      source,
      deliverySigner,
    });
  }
  return setShipmentStatus(shipmentId, { status, label, location, source });
}

export interface AdminIntakeInput {
  customerCode?: string;
  userId?: string;
  serviceType: ServiceType;
  contentType?: ContentType;
  externalTracking?: string;
  externalCarrier?: string;
  contentsDescription?: string;
  vendor?: string;
  weightLbs?: number;
  dimensionLength?: number;
  dimensionWidth?: number;
  dimensionHeight?: number;
  fobValue?: number;
  fobCurrency?: string;
  specialFlags?: SpecialFlag[];
  recipientName?: string;
  recipientPhone?: string;
  originWarehouseId?: string;
  destinationBranchId?: string;
  additionalNotes?: string;
  initialStatus?: 'WAITING' | 'RECEIVED';
  location?: string;
  haitiDepartmentKey?: string;
  haitiDeliveryCity?: string;
}

const STATUS_LABEL_INTAKE: Record<'WAITING' | 'RECEIVED', string> = {
  WAITING: 'Pre-alert created — waiting for package at US warehouse',
  RECEIVED: 'Package received at US warehouse',
};

async function allocateUniqueTrackingCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateTrackingCode();
    const existing = await prisma.shipment.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw Errors.internal('Failed to allocate tracking code');
}

/**
 * Admin "Receive Package" / intake. Creates a shipment owned by the chosen
 * customer (located by `customerCode` or `userId`) and immediately publishes
 * the matching tracking event so the customer's dashboard reflects it.
 *
 * If `initialStatus` is RECEIVED (default), we also fire the customer
 * "Package received at US warehouse" notification email.
 */
export async function adminIntakeShipment(
  input: AdminIntakeInput,
  adminUserId?: string,
  labelImage?: { buffer: Buffer; mimetype: string },
): Promise<unknown> {
  if (!input.customerCode && !input.userId) {
    throw Errors.badRequest('customerCode or userId is required');
  }

  const customer = input.userId
    ? await prisma.user.findUnique({ where: { id: input.userId } })
    : await prisma.user.findUnique({
        where: { customerCode: input.customerCode!.trim().toUpperCase() },
      });

  if (!customer || customer.deletedAt) {
    throw Errors.notFound('Customer not found');
  }
  if (customer.status === 'SUSPENDED') {
    throw Errors.forbidden(
      'Customer account is suspended — cannot intake new packages',
    );
  }

  const initialStatus: 'WAITING' | 'RECEIVED' = input.initialStatus ?? 'RECEIVED';
  const trackingCode = await allocateUniqueTrackingCode();

  const externalTracking = input.externalTracking?.trim() || null;
  if (externalTracking) {
    const dup = await prisma.shipment.findFirst({
      where: { externalTracking, userId: customer.id },
      select: { id: true, trackingCode: true },
    });
    if (dup) {
      throw Errors.conflict(
        `Customer already has a shipment with this external tracking (${dup.trackingCode}).`,
      );
    }
  }

  let labelImageUrl: string | null = null;
  if (labelImage && labelImage.buffer.length > 0) {
    const ext =
      labelImage.mimetype === 'image/png'
        ? 'png'
        : labelImage.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const key = `shipments/${trackingCode}/label.${ext}`;
    const result = await uploadFile({
      key,
      buffer: labelImage.buffer,
      contentType: labelImage.mimetype,
    });
    labelImageUrl = result.url;
  }

  const haiti = await assertHaitiDeliveryAllowed(
    input.haitiDepartmentKey,
    input.haitiDeliveryCity,
  );

  const shipment = await prisma.shipment.create({
    data: {
      trackingCode,
      userId: customer.id,
      externalTracking,
      externalCarrier: input.externalCarrier?.trim() || null,
      serviceType: input.serviceType,
      status: initialStatus,
      contentType: input.contentType ?? 'PACKAGE',
      contentsDescription: input.contentsDescription?.trim() || null,
      vendor: input.vendor?.trim() || null,
      specialFlags: input.specialFlags ?? [],
      weightLbs: input.weightLbs ?? null,
      dimensionLength: input.dimensionLength ?? null,
      dimensionWidth: input.dimensionWidth ?? null,
      dimensionHeight: input.dimensionHeight ?? null,
      fobValue: input.fobValue ?? null,
      fobCurrency: input.fobCurrency ?? 'USD',
      additionalNotes: input.additionalNotes?.trim() || null,
      originWarehouseId: input.originWarehouseId ?? null,
      destinationBranchId: input.destinationBranchId ?? null,
      recipientName: input.recipientName?.trim() || customer.firstName + ' ' + customer.lastName,
      recipientPhone: input.recipientPhone?.trim() || customer.phoneCell || null,
      labelImageUrl,
      haitiDepartmentKey: haiti.deptKey,
      haitiDeliveryCity: haiti.city,
    },
    include: {
      user: {
        select: {
          id: true,
          customerCode: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneCell: true,
        },
      },
    },
  });

  await prisma.trackingEvent.create({
    data: {
      shipmentId: shipment.id,
      status: initialStatus,
      label: STATUS_LABEL_INTAKE[initialStatus],
      location: input.location ?? null,
      notes: adminUserId ? `source:admin-intake;by:${adminUserId}` : 'source:admin-intake',
      createdById: adminUserId ?? null,
    },
  });

  // Fire the matching customer notification (best-effort; don't block).
  if (initialStatus === 'RECEIVED') {
    notifyShipmentStatus(shipment.id, 'RECEIVED').catch((err) => {
      logger.warn(
        { err, shipmentId: shipment.id },
        'notifyShipmentStatus(RECEIVED) failed',
      );
    });
  }

  return shipment;
}

export async function attachShipmentLabelImage(
  shipmentId: string,
  file: { buffer: Buffer; mimetype: string },
): Promise<unknown> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw Errors.notFound('Shipment not found');
  const ext =
    file.mimetype === 'image/png'
      ? 'png'
      : file.mimetype === 'image/webp'
        ? 'webp'
        : 'jpg';
  const key = `shipments/${shipment.trackingCode}/label.${ext}`;
  const r = await uploadFile({ key, buffer: file.buffer, contentType: file.mimetype });
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: { labelImageUrl: r.url },
  });
}

export interface BulkStatusInput {
  shipmentIds: string[];
  status: ShipmentStatus;
  location?: string;
}

export async function adminBulkUpdateStatus(
  input: BulkStatusInput,
): Promise<{ updated: number; failed: string[] }> {
  let updated = 0;
  const failed: string[] = [];
  for (const id of input.shipmentIds) {
    try {
      await setShipmentStatus(id, {
        status: input.status,
        location: input.location,
        source: 'admin-bulk',
      });
      updated++;
    } catch {
      failed.push(id);
    }
  }
  return { updated, failed };
}

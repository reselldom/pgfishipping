import { Prisma, ShipmentStatus, ServiceType } from '@prisma/client';
import { prisma } from '../../config/database';
import { Errors } from '../../utils/response';
import { setShipmentStatus } from '../shipment.service';

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
): Promise<unknown> {
  return setShipmentStatus(shipmentId, { status, label, location, source });
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

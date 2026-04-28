import { Prisma, type Warehouse } from '@prisma/client';
import { prisma } from '../config/database';
import { CUSTOMER_CODE_PREFIX } from '../config/constants';
import { formatCustomerCode } from '../utils/generateCode';
import { env } from '../config/env';

/**
 * Single-line postal string after the customer's name/code line (matches label format).
 */
export function warehouseToShipmentAddressString(w: Pick<
  Warehouse,
  'address' | 'city' | 'state' | 'country'
>): string {
  const parts = [w.address.trim(), w.city.trim()];
  if (w.state?.trim()) parts.push(w.state.trim());
  parts.push(w.country.trim());
  return parts.filter(Boolean).join(', ');
}

/**
 * Allocate the next customer code (HT-XXXXXX) atomically by scanning the
 * highest existing numeric suffix. Retried up to 3 times in case of race.
 */
export async function allocateCustomerCode(
  tx: Prisma.TransactionClient = prisma,
): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await tx.user.findFirst({
      where: { customerCode: { startsWith: CUSTOMER_CODE_PREFIX } },
      orderBy: { customerCode: 'desc' },
      select: { customerCode: true },
    });

    let nextNumber = 1;
    if (last?.customerCode) {
      const num = parseInt(last.customerCode.replace(CUSTOMER_CODE_PREFIX, ''), 10);
      if (!Number.isNaN(num)) nextNumber = num + 1;
    }

    const candidate = formatCustomerCode(nextNumber + attempt);
    const exists = await tx.user.findUnique({
      where: { customerCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  // Fallback: use timestamp-based code (extremely unlikely to hit).
  return formatCustomerCode(Date.now() % 1_000_000);
}

export interface BuildAddressArgs {
  customerCode: string;
  firstName: string;
  lastName: string;
  warehouseAddress?: string;
}

export function buildWarehouseAddress({
  customerCode,
  firstName,
  lastName,
  warehouseAddress,
}: BuildAddressArgs): { airAddress: string; seaAddress: string } {
  const fullName = `${firstName} ${lastName}`.trim();
  const usAddress = warehouseAddress ?? env.DEFAULT_US_WAREHOUSE_ADDRESS;
  return {
    airAddress: `${fullName}/${customerCode}/A\n${usAddress}`,
    seaAddress: `${fullName}/${customerCode}/B\n${usAddress}`,
  };
}

/** Line used for `/A` & `/B` blocks: linked US depot, primary US hub, or env default. */
export async function resolvePhysicalWarehouseLineForCustomer(
  warehouseId: string | null,
): Promise<string> {
  if (warehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (wh?.type === 'US') return warehouseToShipmentAddressString(wh);
  }

  const primary = await prisma.warehouse.findFirst({
    where: { type: 'US', isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  if (primary) return warehouseToShipmentAddressString(primary);

  return env.DEFAULT_US_WAREHOUSE_ADDRESS;
}

/** Refresh stored Air/Sea strings for one customer (after name change or depot move). */
export async function refreshUsWarehouseAddressStringsForUserId(
  userId: string,
): Promise<void> {
  const row = await prisma.usWarehouseAddress.findUnique({
    where: { userId },
    include: {
      user: { select: { customerCode: true, firstName: true, lastName: true } },
    },
  });
  if (!row) return;

  const line = await resolvePhysicalWarehouseLineForCustomer(row.warehouseId);

  const { airAddress, seaAddress } = buildWarehouseAddress({
    customerCode: row.user.customerCode,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    warehouseAddress: line,
  });

  await prisma.usWarehouseAddress.update({
    where: { userId },
    data: { airAddress, seaAddress },
  });
}

/**
 * After a US depot's street/city/country is edited in Admin, push the new line
 * into every customer's stored US delivery block.
 */
export async function syncCustomerUsWarehouseLabelsAfterUsWarehouseUpdate(
  warehouse: Warehouse,
): Promise<number> {
  if (warehouse.type !== 'US') return 0;

  const addrLine = warehouseToShipmentAddressString(warehouse);

  const activeUsHubs = await prisma.warehouse.count({
    where: { type: 'US', isActive: true },
  });

  const singleUsHub = activeUsHubs <= 1;

  const where: Prisma.UsWarehouseAddressWhereInput = singleUsHub
    ? { OR: [{ warehouseId: warehouse.id }, { warehouseId: null }] }
    : { warehouseId: warehouse.id };

  const rows = await prisma.usWarehouseAddress.findMany({
    where,
    include: {
      user: { select: { customerCode: true, firstName: true, lastName: true } },
    },
  });

  await prisma.$transaction(
    rows.map((row) => {
      const { airAddress, seaAddress } = buildWarehouseAddress({
        customerCode: row.user.customerCode,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        warehouseAddress: addrLine,
      });
      return prisma.usWarehouseAddress.update({
        where: { id: row.id },
        data: { airAddress, seaAddress },
      });
    }),
  );

  return rows.length;
}

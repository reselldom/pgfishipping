import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { CUSTOMER_CODE_PREFIX } from '../config/constants';
import { formatCustomerCode } from '../utils/generateCode';
import { env } from '../config/env';

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

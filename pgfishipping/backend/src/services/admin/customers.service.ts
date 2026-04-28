import { Prisma, UserStatus, TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { Errors } from '../../utils/response';
import { CUSTOMER_CODE_PREFIX } from '../../config/constants';
import { buildWarehouseAddress, resolvePhysicalWarehouseLineForCustomer } from '../customerCode.service';

export interface ListCustomersInput {
  search?: string;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

export async function listCustomers(input: ListCustomersInput): Promise<{
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  const where: Prisma.UserWhereInput = {
    role: 'CUSTOMER',
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { email: { contains: input.search, mode: 'insensitive' as const } },
            { firstName: { contains: input.search, mode: 'insensitive' as const } },
            { lastName: { contains: input.search, mode: 'insensitive' as const } },
            { customerCode: { contains: input.search, mode: 'insensitive' as const } },
            { phoneCell: { contains: input.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        customerCode: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneCell: true,
        status: true,
        clientType: true,
        language: true,
        loyaltyPoints: true,
        createdAt: true,
        wallet: { select: { balanceUsd: true, balanceHtg: true } },
        _count: { select: { addresses: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getCustomerDetail(userId: string): Promise<unknown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      usWarehouseAddress: true,
      addresses: true,
      _count: { select: { referrals: true } },
    },
  });
  if (!user) throw Errors.notFound('Customer not found');

  const walletId = user.wallet?.id;
  const [shipmentCount, totalSpentAgg, recentShipments, recentTx] =
    await Promise.all([
      prisma.shipment.count({ where: { userId } }),
      walletId
        ? prisma.transaction.aggregate({
            where: { walletId, type: 'PAYMENT', status: 'COMPLETED' },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
      prisma.shipment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          trackingCode: true,
          status: true,
          serviceType: true,
          totalCost: true,
          createdAt: true,
        },
      }),
      walletId
        ? prisma.transaction.findMany({
            where: { walletId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              type: true,
              amount: true,
              status: true,
              paymentMethod: true,
              reference: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

  return {
    user,
    stats: {
      shipmentCount,
      totalPaidUsd: totalSpentAgg._sum.amount ?? 0,
    },
    recentShipments,
    recentTransactions: recentTx,
  };
}

export async function updateCustomerStatus(
  userId: string,
  status: UserStatus,
): Promise<unknown> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('Customer not found');
  return prisma.user.update({ where: { id: userId }, data: { status } });
}

/**
 * Quick customer lookup used by the admin "Receive Package" intake form.
 * Accepts either a full customer code (HT-XXXXXX), case-insensitive, or
 * just the numeric tail (the leading "HT-" is added automatically).
 * Returns the minimal info needed to populate the intake form.
 */
/**
 * Type-ahead search for the admin intake form (name, email, phone, or code).
 */
export async function searchCustomersForIntake(
  q: string,
  limit = 8,
): Promise<
  Array<{
    id: string;
    customerCode: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneCell: string | null;
    status: UserStatus;
  }>
> {
  const term = q.trim();
  if (term.length < 2) return [];
  const take = Math.min(20, Math.max(1, limit));
  return prisma.user.findMany({
    where: {
      role: 'CUSTOMER',
      deletedAt: null,
      OR: [
        { customerCode: { contains: term, mode: 'insensitive' as const } },
        { email: { contains: term, mode: 'insensitive' as const } },
        { firstName: { contains: term, mode: 'insensitive' as const } },
        { lastName: { contains: term, mode: 'insensitive' as const } },
        { phoneCell: { contains: term } },
      ],
    },
    take,
    orderBy: { customerCode: 'asc' },
    select: {
      id: true,
      customerCode: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneCell: true,
      status: true,
    },
  });
}

export async function findCustomerForIntake(
  rawCode: string,
): Promise<{
  id: string;
  customerCode: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneCell: string | null;
  phoneHome: string | null;
  status: UserStatus;
  language: string;
  emailVerified: boolean;
  loyaltyPoints: number;
  createdAt: Date;
  walletUsd: number;
  walletHtg: number;
  airAddress: string;
  seaAddress: string;
}> {
  const trimmed = rawCode.trim();
  if (!trimmed) throw Errors.badRequest('Customer code is required');
  const code = trimmed.toUpperCase().startsWith(CUSTOMER_CODE_PREFIX)
    ? trimmed.toUpperCase()
    : `${CUSTOMER_CODE_PREFIX}${trimmed}`.toUpperCase();
  const user = await prisma.user.findUnique({
    where: { customerCode: code },
    include: { wallet: true, usWarehouseAddress: true },
  });
  if (!user || user.deletedAt) throw Errors.notFound('Customer not found');
  if (user.role !== 'CUSTOMER') {
    throw Errors.badRequest('That account is not a customer account');
  }
  let airAddress: string;
  let seaAddress: string;
  if (user.usWarehouseAddress) {
    airAddress = user.usWarehouseAddress.airAddress;
    seaAddress = user.usWarehouseAddress.seaAddress;
  } else {
    const line = await resolvePhysicalWarehouseLineForCustomer(null);
    const built = buildWarehouseAddress({
      customerCode: user.customerCode,
      firstName: user.firstName,
      lastName: user.lastName,
      warehouseAddress: line,
    });
    airAddress = built.airAddress;
    seaAddress = built.seaAddress;
  }

  return {
    id: user.id,
    customerCode: user.customerCode,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneCell: user.phoneCell,
    phoneHome: user.phoneHome,
    status: user.status,
    language: user.language,
    emailVerified: user.emailVerified,
    loyaltyPoints: user.loyaltyPoints,
    createdAt: user.createdAt,
    walletUsd: user.wallet?.balanceUsd ?? 0,
    walletHtg: user.wallet?.balanceHtg ?? 0,
    airAddress,
    seaAddress,
  };
}

export async function adjustWalletBalance(
  userId: string,
  amountUsd: number,
  reason: string,
  adminId: string,
): Promise<unknown> {
  if (amountUsd === 0) throw Errors.badRequest('Amount cannot be zero');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
  if (!user) throw Errors.notFound('Customer not found');

  return prisma.$transaction(async (tx) => {
    const wallet =
      user.wallet ??
      (await tx.wallet.create({ data: { userId } }));

    if (amountUsd < 0 && wallet.balanceUsd + amountUsd < 0) {
      throw Errors.badRequest('Adjustment would result in negative balance');
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balanceUsd: { increment: amountUsd } },
    });

    return tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.ADJUSTMENT,
        amount: amountUsd,
        currency: 'USD',
        status: 'COMPLETED',
        paymentMethod: 'ADMIN_ADJUSTMENT',
        notes: `Adjustment by admin ${adminId}: ${reason}`,
      },
    });
  });
}

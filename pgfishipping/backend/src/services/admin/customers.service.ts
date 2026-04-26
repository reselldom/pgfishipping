import { Prisma, UserStatus, TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { Errors } from '../../utils/response';

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

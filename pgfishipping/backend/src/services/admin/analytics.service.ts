import { prisma } from '../../config/database';

export interface DashboardStats {
  customers: { total: number; active: number; suspended: number; newLast30d: number };
  shipments: {
    total: number;
    waiting: number;
    inTransit: number;
    available: number;
    delivered: number;
    last30d: number;
  };
  revenue: {
    last30dUsd: number;
    pendingDepositsUsd: number;
    totalWalletBalanceUsd: number;
  };
  giftCards: { active: number; activeValueUsd: number };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    customersTotal,
    customersActive,
    customersSuspended,
    customersNew,
    shipmentsTotal,
    shipmentsWaiting,
    shipmentsInTransit1,
    shipmentsInTransit2,
    shipmentsAvailable,
    shipmentsDelivered,
    shipmentsRecent,
    revenueAgg,
    pendingDepositsAgg,
    walletBalanceAgg,
    giftCardActive,
    giftCardValue,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', status: 'SUSPENDED' } }),
    prisma.user.count({
      where: { role: 'CUSTOMER', createdAt: { gte: since } },
    }),
    prisma.shipment.count(),
    prisma.shipment.count({ where: { status: 'WAITING' } }),
    prisma.shipment.count({ where: { status: 'IN_TRANSIT' } }),
    prisma.shipment.count({ where: { status: 'IN_TRANSIT_B' } }),
    prisma.shipment.count({ where: { status: 'AVAILABLE' } }),
    prisma.shipment.count({ where: { status: 'DELIVERED' } }),
    prisma.shipment.count({ where: { createdAt: { gte: since } } }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: 'PAYMENT',
        status: 'COMPLETED',
        createdAt: { gte: since },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'DEPOSIT', status: 'PENDING' },
    }),
    prisma.wallet.aggregate({ _sum: { balanceUsd: true } }),
    prisma.giftCard.count({ where: { status: 'ACTIVE' } }),
    prisma.giftCard.aggregate({
      _sum: { valueUsd: true },
      where: { status: 'ACTIVE' },
    }),
  ]);

  return {
    customers: {
      total: customersTotal,
      active: customersActive,
      suspended: customersSuspended,
      newLast30d: customersNew,
    },
    shipments: {
      total: shipmentsTotal,
      waiting: shipmentsWaiting,
      inTransit: shipmentsInTransit1 + shipmentsInTransit2,
      available: shipmentsAvailable,
      delivered: shipmentsDelivered,
      last30d: shipmentsRecent,
    },
    revenue: {
      last30dUsd: revenueAgg._sum.amount ?? 0,
      pendingDepositsUsd: pendingDepositsAgg._sum.amount ?? 0,
      totalWalletBalanceUsd: walletBalanceAgg._sum.balanceUsd ?? 0,
    },
    giftCards: {
      active: giftCardActive,
      activeValueUsd: giftCardValue._sum.valueUsd ?? 0,
    },
  };
}

export interface RevenueByDay {
  date: string;
  revenueUsd: number;
}

export async function getRevenueLast30Days(): Promise<RevenueByDay[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.transaction.findMany({
    where: {
      type: 'PAYMENT',
      status: 'COMPLETED',
      createdAt: { gte: since },
    },
    select: { amount: true, createdAt: true },
  });
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const day = r.createdAt.toISOString().slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + r.amount);
  }
  return Array.from(buckets.entries())
    .map(([date, revenueUsd]) => ({ date, revenueUsd }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

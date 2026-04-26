import {
  PaymentMethod,
  Prisma,
  type Transaction,
  type Wallet,
} from '@prisma/client';
import { prisma } from '../config/database';
import { Errors } from '../utils/response';
import { WALLET } from '../config/constants';
import { getUsdToHtgRate } from './exchangeRate.service';
import { generateRandomToken } from '../utils/generateCode';
import { env } from '../config/env';

export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { userId } });
}

export async function getBalance(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<{
  balanceUsd: number;
  balanceHtg: number;
  exchangeRate: number;
  transactions: { items: Transaction[]; total: number; page: number; pageSize: number };
}> {
  const wallet = await getOrCreateWallet(userId);
  const rate = await getUsdToHtgRate();

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where: { walletId: wallet.id } }),
  ]);

  return {
    balanceUsd: wallet.balanceUsd,
    balanceHtg: round2(wallet.balanceUsd * rate),
    exchangeRate: rate,
    transactions: { items, total, page, pageSize },
  };
}

export interface DepositInitResult {
  transactionId: string;
  reference: string;
  paymentMethod: PaymentMethod;
  amountUsd: number;
  redirectUrl: string;
  /** Provider sandbox: send this to /webhooks/<provider> to confirm. */
  sandboxConfirmation?: { secret: string; payload: Record<string, unknown> };
}

export async function initDeposit(
  userId: string,
  amountUsd: number,
  paymentMethod: PaymentMethod,
): Promise<DepositInitResult> {
  if (amountUsd < WALLET.MIN_DEPOSIT_USD) {
    throw Errors.badRequest(
      `Minimum deposit is $${WALLET.MIN_DEPOSIT_USD.toFixed(2)} USD`,
    );
  }
  if (
    paymentMethod !== 'MONCASH' &&
    paymentMethod !== 'NATCASH' &&
    paymentMethod !== 'PAYMON' &&
    paymentMethod !== 'BANK_TRANSFER'
  ) {
    throw Errors.badRequest('Unsupported payment method for deposit');
  }
  const wallet = await getOrCreateWallet(userId);
  const reference = `dep_${generateRandomToken(8).toUpperCase()}`;

  const tx = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      type: 'DEPOSIT',
      amount: amountUsd,
      currency: 'USD',
      paymentMethod,
      status: 'PENDING',
      reference,
      notes: 'Deposit initiated',
    },
  });

  const redirectUrl = `${env.APP_URL}/wallet/deposit/return?ref=${reference}&provider=${paymentMethod.toLowerCase()}`;

  return {
    transactionId: tx.id,
    reference,
    paymentMethod,
    amountUsd,
    redirectUrl,
    sandboxConfirmation: {
      secret: env.WEBHOOK_SHARED_SECRET ?? 'dev-webhook-secret',
      payload: { reference, status: 'success', amount: amountUsd },
    },
  };
}

/**
 * Confirms a deposit. Webhook hits this after the provider acknowledges.
 * Idempotent: a second hit with the same reference is a no-op.
 */
export async function confirmDeposit(reference: string): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    const t = await tx.transaction.findFirst({ where: { reference } });
    if (!t) throw Errors.notFound('Transaction not found');
    if (t.status === 'COMPLETED') return t;
    if (t.status !== 'PENDING') {
      throw Errors.badRequest(`Cannot confirm transaction in state ${t.status}`);
    }

    const updated = await tx.transaction.update({
      where: { id: t.id },
      data: { status: 'COMPLETED', notes: 'Deposit confirmed' },
    });

    await tx.wallet.update({
      where: { id: t.walletId },
      data: { balanceUsd: { increment: t.amount } },
    });

    return updated;
  });
}

export async function failDeposit(reference: string, reason: string): Promise<void> {
  const t = await prisma.transaction.findFirst({ where: { reference } });
  if (!t) return;
  if (t.status !== 'PENDING') return;
  await prisma.transaction.update({
    where: { id: t.id },
    data: { status: 'FAILED', notes: `Failed: ${reason}` },
  });
}

export async function redeemGiftCard(
  userId: string,
  code: string,
): Promise<{ creditedUsd: number; balanceUsd: number }> {
  const trimmed = code.trim().toUpperCase();
  return prisma.$transaction(async (tx) => {
    const card = await tx.giftCard.findUnique({ where: { code: trimmed } });
    if (!card) throw Errors.notFound('Gift card not found');
    if (card.status !== 'ACTIVE') {
      throw Errors.badRequest(`Gift card is ${card.status.toLowerCase()}`);
    }
    if (card.expiresAt && card.expiresAt < new Date()) {
      await tx.giftCard.update({
        where: { id: card.id },
        data: { status: 'EXPIRED' },
      });
      throw Errors.badRequest('Gift card has expired');
    }

    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    await tx.giftCard.update({
      where: { id: card.id },
      data: { status: 'USED', usedBy: userId },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'GIFT_CARD_REDEMPTION',
        amount: card.valueUsd,
        currency: 'USD',
        paymentMethod: 'GIFT_CARD',
        status: 'COMPLETED',
        reference: `gc_${card.code}`,
        giftCardId: card.id,
        notes: `Redeemed gift card ${card.code}`,
      },
    });

    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balanceUsd: { increment: card.valueUsd } },
    });

    return {
      creditedUsd: card.valueUsd,
      balanceUsd: updated.balanceUsd,
    };
  });
}

export async function payShipment(
  userId: string,
  shipmentId: string,
  amountUsd: number,
): Promise<{ balanceUsd: number; transactionId: string }> {
  if (amountUsd <= 0) throw Errors.badRequest('Amount must be positive');
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, userId: true, paidAt: true, totalCost: true },
    });
    if (!shipment) throw Errors.notFound('Shipment not found');
    if (shipment.userId !== userId) throw Errors.forbidden('Not your shipment');
    if (shipment.paidAt) throw Errors.badRequest('Shipment is already paid');

    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    if (wallet.balanceUsd < amountUsd) {
      throw Errors.badRequest('Insufficient wallet balance');
    }

    const t = await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'PAYMENT',
        amount: amountUsd,
        currency: 'USD',
        status: 'COMPLETED',
        reference: `pay_${shipmentId}`,
        shipmentId,
        notes: 'Wallet payment for shipment',
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balanceUsd: { decrement: amountUsd } },
    });

    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        paidAt: new Date(),
        totalCost: amountUsd,
      },
    });

    const updated = await tx.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    return { balanceUsd: updated.balanceUsd, transactionId: t.id };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Avoid unused-import warning when this module's typegen narrows.
export type { Prisma };

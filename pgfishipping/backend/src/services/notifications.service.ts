import { ShipmentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { sendEmail } from './email.service';
import { logger } from '../utils/logger';
import { getUsdToHtgRate } from './exchangeRate.service';

import { welcomeEmail } from '../emails/templates/welcome';
import { passwordResetEmail } from '../emails/templates/passwordReset';
import { verifyEmailTemplate } from '../emails/templates/verifyEmail';
import { packageReceivedEmail } from '../emails/templates/packageReceived';
import { packageInTransitEmail } from '../emails/templates/packageInTransit';
import { packageAvailableEmail } from '../emails/templates/packageAvailable';
import { packageDeliveredEmail } from '../emails/templates/packageDelivered';
import { walletDepositEmail } from '../emails/templates/walletDeposit';
import { thirdPartyAuthEmail } from '../emails/templates/thirdPartyAuth';

export type NotificationTemplate =
  | 'welcome'
  | 'password_reset'
  | 'verify_email'
  | 'package_received'
  | 'package_in_transit'
  | 'package_available'
  | 'package_delivered'
  | 'wallet_deposit'
  | 'third_party_auth';

interface DispatchResult {
  ok: boolean;
  template: NotificationTemplate;
}

async function dispatch(
  userId: string,
  toEmail: string,
  template: NotificationTemplate,
  rendered: { subject: string; html: string; text: string },
): Promise<DispatchResult> {
  const result = await sendEmail({
    to: toEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    template,
  });

  try {
    await prisma.notificationLog.create({
      data: {
        userId,
        channel: 'EMAIL',
        template,
        subject: rendered.subject,
        toEmail,
        status: result.ok ? 'sent' : `failed:${result.error ?? 'unknown'}`,
      },
    });
  } catch (err) {
    logger.warn({ err, userId, template }, 'NotificationLog write failed');
  }

  return { ok: result.ok, template };
}

// ─── High-level notification helpers ────────────────────────────────────────

export async function notifyWelcome(
  userId: string,
  args: { firstName: string; customerCode: string; airAddress: string; seaAddress: string },
): Promise<DispatchResult | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return dispatch(userId, user.email, 'welcome', welcomeEmail(args));
}

export async function notifyPasswordReset(
  userId: string,
  args: { firstName: string; resetUrl: string; expiresInMinutes: number },
): Promise<DispatchResult | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return dispatch(userId, user.email, 'password_reset', passwordResetEmail(args));
}

export async function notifyVerifyEmail(
  userId: string,
  args: { firstName: string; verifyUrl: string },
): Promise<DispatchResult | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return dispatch(userId, user.email, 'verify_email', verifyEmailTemplate(args));
}

const SHIPMENT_STATUS_TEMPLATE: Partial<Record<ShipmentStatus, NotificationTemplate>> = {
  RECEIVED: 'package_received',
  IN_TRANSIT: 'package_in_transit',
  IN_TRANSIT_B: 'package_in_transit',
  AVAILABLE: 'package_available',
  DELIVERED: 'package_delivered',
};

export async function notifyShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
): Promise<DispatchResult | null> {
  const template = SHIPMENT_STATUS_TEMPLATE[status];
  if (!template) return null;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      user: true,
      destinationBranch: true,
    },
  });
  if (!shipment || !shipment.user) return null;

  const firstName = shipment.user.firstName;
  let rendered;
  if (template === 'package_received') {
    rendered = packageReceivedEmail({
      firstName,
      trackingCode: shipment.trackingCode,
      weightLbs: shipment.weightLbs,
      contents: shipment.contentsDescription,
      warehouseName: shipment.destinationBranch?.name ?? null,
    });
  } else if (template === 'package_in_transit') {
    rendered = packageInTransitEmail({
      firstName,
      trackingCode: shipment.trackingCode,
      serviceType: shipment.serviceType,
      estimatedArrival: null,
    });
  } else if (template === 'package_available') {
    const totalUsd = shipment.totalCost ?? null;
    const rate = await getUsdToHtgRate();
    rendered = packageAvailableEmail({
      firstName,
      trackingCode: shipment.trackingCode,
      branchName: shipment.destinationBranch?.name ?? null,
      branchAddress: shipment.destinationBranch?.address ?? null,
      branchPhone: shipment.destinationBranch?.phone ?? null,
      branchHours: null,
      totalDueUsd: totalUsd,
      totalDueHtg: totalUsd ? Math.round(totalUsd * rate) : null,
    });
  } else {
    rendered = packageDeliveredEmail({
      firstName,
      trackingCode: shipment.trackingCode,
      pickedUpAt: shipment.deliveredAt ?? new Date(),
    });
  }

  return dispatch(shipment.userId, shipment.user.email, template, rendered);
}

export async function notifyDepositConfirmed(
  transactionId: string,
): Promise<DispatchResult | null> {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { wallet: { include: { user: true } } },
  });
  if (!tx || !tx.wallet?.user) return null;
  const user = tx.wallet.user;

  return dispatch(user.id, user.email, 'wallet_deposit', walletDepositEmail({
    firstName: user.firstName,
    amountUsd: tx.amount,
    newBalanceUsd: tx.wallet.balanceUsd,
    paymentMethod: tx.paymentMethod ?? 'Unknown',
    reference: tx.reference ?? tx.id,
  }));
}

export async function notifyThirdPartyAuth(
  shipmentId: string,
): Promise<DispatchResult | null> {
  const auth = await prisma.thirdPartyAuth.findUnique({
    where: { shipmentId },
    include: {
      shipment: { include: { user: true } },
    },
  });
  if (!auth || !auth.shipment?.user) return null;
  const user = auth.shipment.user;

  return dispatch(user.id, user.email, 'third_party_auth', thirdPartyAuthEmail({
    firstName: user.firstName,
    trackingCode: auth.shipment.trackingCode,
    authorizedName: auth.authorizedName,
    idType: auth.idType,
    idNumber: auth.idNumber,
  }));
}

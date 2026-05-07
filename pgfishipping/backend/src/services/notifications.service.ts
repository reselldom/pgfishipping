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
import { packageStatusAlertEmail } from '../emails/templates/packageStatusAlert';
import { walletDepositEmail } from '../emails/templates/walletDeposit';
import { thirdPartyAuthEmail } from '../emails/templates/thirdPartyAuth';
import { passwordChangedEmail } from '../emails/templates/passwordChanged';
import { passwordResetSuccessEmail } from '../emails/templates/passwordResetSuccess';
import { emailVerifiedEmail } from '../emails/templates/emailVerified';

export type NotificationTemplate =
  | 'welcome'
  | 'password_reset'
  | 'verify_email'
  | 'password_changed'
  | 'password_reset_success'
  | 'email_verified'
  | 'package_received'
  | 'package_in_transit'
  | 'package_available'
  | 'package_delivered'
  | 'package_status_alert'
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
  INVENTORY: 'package_status_alert',
  RETURNED: 'package_status_alert',
  LOST: 'package_status_alert',
  CANCELLED: 'package_status_alert',
};

/** Statuses that use the generic package_status_alert template. */
const STATUS_ALERT_COPY: Partial<
  Record<
    ShipmentStatus,
    { statusTitle: string; message: string }
  >
> = {
  INVENTORY: {
    statusTitle: 'In inventory',
    message:
      'Your package has arrived at our destination facility and is in inventory. We will notify you when it is ready for pickup or out for delivery.',
  },
  RETURNED: {
    statusTitle: 'Returned',
    message:
      'Your shipment was returned. If you have questions, please contact support.',
  },
  LOST: {
    statusTitle: 'Shipment issue',
    message:
      'We are sorry — your shipment was marked as lost. Our team will contact you regarding next steps.',
  },
  CANCELLED: {
    statusTitle: 'Cancelled',
    message:
      'Your shipment was cancelled. If this was unexpected, please contact support.',
  },
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
  } else if (template === 'package_status_alert') {
    const copy = STATUS_ALERT_COPY[status];
    if (!copy) return null;
    rendered = packageStatusAlertEmail({
      firstName,
      trackingCode: shipment.trackingCode,
      statusTitle: copy.statusTitle,
      message: copy.message,
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

export async function notifyPasswordChanged(userId: string): Promise<DispatchResult | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return dispatch(
    userId,
    user.email,
    'password_changed',
    passwordChangedEmail({ firstName: user.firstName }),
  );
}

export async function notifyPasswordResetSuccess(
  userId: string,
): Promise<DispatchResult | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return dispatch(
    userId,
    user.email,
    'password_reset_success',
    passwordResetSuccessEmail({ firstName: user.firstName }),
  );
}

export async function notifyEmailAddressVerified(
  userId: string,
): Promise<DispatchResult | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return dispatch(
    userId,
    user.email,
    'email_verified',
    emailVerifiedEmail({ firstName: user.firstName }),
  );
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

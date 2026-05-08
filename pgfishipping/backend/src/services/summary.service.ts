import { prisma } from '../config/database';
import { sendEmail } from './email.service';
import { logger } from '../utils/logger';
import { esc, layout } from '../emails/templates/_helpers';
import { publicWebUrl } from '../utils/publicWebUrl';
import type { Language } from '@prisma/client';

export interface UserWeeklySummary {
  userId: string;
  email: string;
  firstName: string;
  language: Language;
  newPackages: number;
  delivered: number;
  inTransit: number;
  available: number;
  walletBalanceUsd: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function buildUserWeeklySummary(
  userId: string,
  windowMs: number = WEEK_MS,
): Promise<UserWeeklySummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
  if (!user || user.deletedAt) return null;

  const since = new Date(Date.now() - windowMs);

  const [newPackages, delivered, inTransit, available] = await Promise.all([
    prisma.shipment.count({
      where: { userId, createdAt: { gte: since } },
    }),
    prisma.shipment.count({
      where: { userId, deliveredAt: { gte: since } },
    }),
    prisma.shipment.count({
      where: { userId, status: { in: ['IN_TRANSIT', 'IN_TRANSIT_B'] } },
    }),
    prisma.shipment.count({
      where: { userId, status: 'AVAILABLE' },
    }),
  ]);

  return {
    userId,
    email: user.email,
    firstName: user.firstName,
    language: user.language,
    newPackages,
    delivered,
    inTransit,
    available,
    walletBalanceUsd: user.wallet?.balanceUsd ?? 0,
  };
}

export async function listSummaryRecipients(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      emailVerified: true,
      role: 'CUSTOMER',
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export function renderWeeklySummary(s: UserWeeklySummary): {
  subject: string;
  html: string;
  text: string;
} {
  const total = s.newPackages + s.delivered + s.inTransit + s.available;
  const subject = `Your PGFI weekly summary — ${total} package${total === 1 ? '' : 's'}`;
  const text = `Hi ${s.firstName},

Here's your week at a glance:
  • New packages this week: ${s.newPackages}
  • Currently in transit:    ${s.inTransit}
  • Ready for pickup:        ${s.available}
  • Delivered this week:     ${s.delivered}

Wallet balance: $${s.walletBalanceUsd.toFixed(2)} USD

Dashboard: ${publicWebUrl('/dashboard', s.language)}`;

  const html = layout({
    title: 'Your PGFI weekly summary',
    preheader: `${total} package${total === 1 ? '' : 's'} this week`,
    bodyHtml: `
      <p>Hi ${esc(s.firstName)},</p>
      <p>Here's your week at a glance:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f6f8fb;padding:16px;border-radius:8px">
        <tr><td style="padding:8px 0;color:#666">New packages this week</td><td style="padding:8px 0;text-align:right"><strong>${s.newPackages}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#666">In transit</td><td style="padding:8px 0;text-align:right"><strong>${s.inTransit}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#666">Ready for pickup</td><td style="padding:8px 0;text-align:right"><strong>${s.available}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#666">Delivered this week</td><td style="padding:8px 0;text-align:right"><strong>${s.delivered}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#666;border-top:1px solid #e0e6ee"><strong>Wallet balance</strong></td><td style="padding:8px 0;text-align:right;border-top:1px solid #e0e6ee"><strong>$${s.walletBalanceUsd.toFixed(2)} USD</strong></td></tr>
      </table>
    `,
    ctaUrl: publicWebUrl('/dashboard', s.language),
    ctaLabel: 'Go to dashboard',
  });
  return { subject, html, text };
}

export async function sendUserWeeklySummary(userId: string): Promise<boolean> {
  const summary = await buildUserWeeklySummary(userId);
  if (!summary) return false;
  // Skip users with literally nothing to report.
  const total =
    summary.newPackages + summary.delivered + summary.inTransit + summary.available;
  if (total === 0) return false;

  const rendered = renderWeeklySummary(summary);
  const result = await sendEmail({
    to: summary.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    template: 'weekly_summary',
  });

  try {
    await prisma.notificationLog.create({
      data: {
        userId,
        channel: 'EMAIL',
        template: 'weekly_summary',
        subject: rendered.subject,
        toEmail: summary.email,
        status: result.ok ? 'sent' : `failed:${result.error ?? 'unknown'}`,
      },
    });
  } catch (err) {
    logger.warn({ err, userId }, 'NotificationLog write failed (weekly_summary)');
  }
  return result.ok;
}

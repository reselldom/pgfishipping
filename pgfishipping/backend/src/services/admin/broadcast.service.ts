import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendEmail } from '../email.service';
import { logger } from '../../utils/logger';
import { Errors } from '../../utils/response';
import { esc, layout } from '../../emails/templates/_helpers';

export interface BroadcastInput {
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  segment?: 'all' | 'active' | 'verified' | 'with-balance';
  customerIds?: string[];
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  recipients: number;
}

function buildWhere(input: BroadcastInput): Prisma.UserWhereInput {
  if (input.customerIds && input.customerIds.length > 0) {
    return { id: { in: input.customerIds } };
  }
  const base: Prisma.UserWhereInput = { role: 'CUSTOMER', deletedAt: null };
  switch (input.segment) {
    case 'active':
      return { ...base, status: 'ACTIVE' };
    case 'verified':
      return { ...base, emailVerified: true };
    case 'with-balance':
      return { ...base, wallet: { balanceUsd: { gt: 0 } } };
    default:
      return base;
  }
}

export async function previewBroadcastRecipients(
  input: BroadcastInput,
): Promise<{ count: number; sample: { email: string; firstName: string }[] }> {
  const where = buildWhere(input);
  const [count, sample] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      take: 5,
      select: { email: true, firstName: true },
    }),
  ]);
  return { count, sample };
}

export async function sendBroadcast(input: BroadcastInput): Promise<BroadcastResult> {
  if (!input.subject?.trim()) throw Errors.badRequest('Subject required');
  if (!input.bodyHtml?.trim()) throw Errors.badRequest('Body required');
  const where = buildWhere(input);

  const recipients = await prisma.user.findMany({
    where,
    select: { id: true, email: true, firstName: true },
    take: 5000,
  });

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const html = layout({
      title: input.subject,
      bodyHtml: `<p>Hi ${esc(r.firstName)},</p>${input.bodyHtml}`,
    });
    const text = input.bodyText ?? input.subject;
    const result = await sendEmail({
      to: r.email,
      subject: input.subject,
      html,
      text,
      template: 'broadcast',
    });
    if (result.ok) sent++;
    else failed++;
    try {
      await prisma.notificationLog.create({
        data: {
          userId: r.id,
          channel: 'EMAIL',
          template: 'broadcast',
          subject: input.subject,
          toEmail: r.email,
          status: result.ok ? 'sent' : `failed:${result.error ?? 'unknown'}`,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'NotificationLog write failed (broadcast)');
    }
  }
  return { sent, failed, recipients: recipients.length };
}

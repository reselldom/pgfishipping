import { env, isProd } from '../config/env';
import { logger } from '../utils/logger';

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // For NotificationLog (so caller can persist the template name).
  template?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  provider: 'resend' | 'console';
  error?: string;
}

/** True when Resend is configured; otherwise emails only go to server logs (console transport). */
export function isEmailDeliveryConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY?.trim());
}

/**
 * Call once at process startup (API and worker) so operators see a clear message
 * when transactional email cannot reach customers.
 */
export function logEmailTransportStatus(): void {
  if (!isEmailDeliveryConfigured()) {
    if (isProd) {
      logger.error(
        'RESEND_API_KEY is not set — transactional email (signup, password, shipments, wallet) is NOT delivered to users. Set RESEND_API_KEY and verify your sending domain in Resend.',
      );
    } else {
      logger.warn(
        'RESEND_API_KEY is not set — emails are printed to the console only (dev).',
      );
    }
    return;
  }
  logger.info(
    { from: env.EMAIL_FROM },
    'Transactional email enabled (Resend).',
  );
}

let resendInstance: import('resend').Resend | null = null;
async function getResend(): Promise<import('resend').Resend | null> {
  if (!isEmailDeliveryConfigured()) return null;
  if (resendInstance) return resendInstance;
  try {
    const mod = await import('resend');
    resendInstance = new mod.Resend(env.RESEND_API_KEY);
    return resendInstance;
  } catch (err) {
    logger.warn(
      { err },
      'Resend package not installed; falling back to console transport',
    );
    return null;
  }
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const resend = await getResend();
  if (!resend) {
    logger.info(
      { to: args.to, subject: args.subject, template: args.template },
      '📧 [DEV] Email (console transport)',
    );
    if (env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log('───────── Email Preview ─────────');
      // eslint-disable-next-line no-console
      console.log(`To:       ${args.to}`);
      // eslint-disable-next-line no-console
      console.log(`Subject:  ${args.subject}`);
      // eslint-disable-next-line no-console
      console.log(`Template: ${args.template ?? '(inline)'}`);
      // eslint-disable-next-line no-console
      console.log('─────────────────────────────────');
    }
    return { ok: true, provider: 'console' };
  }
  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo ?? env.EMAIL_REPLY_TO,
    });
    if (result.error) {
      logger.error({ err: result.error }, 'Resend send error');
      return { ok: false, provider: 'resend', error: result.error.message };
    }
    return { ok: true, id: result.data?.id, provider: 'resend' };
  } catch (err) {
    logger.error({ err }, 'Email send failed');
    return {
      ok: false,
      provider: 'resend',
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

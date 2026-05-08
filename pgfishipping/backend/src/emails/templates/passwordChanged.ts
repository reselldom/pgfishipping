import { env } from '../../config/env';
import { esc, layout } from './_helpers';
import { publicWebUrl } from '../../utils/publicWebUrl';
import type { Language } from '@prisma/client';

export function passwordChangedEmail(args: {
  firstName: string;
  language?: Language | null;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Your PGFI Shipping password was changed';
  const text = `Hello ${args.firstName},

Your account password was just changed. If this was you, no action is needed.

If you did not change your password, reset it immediately: ${publicWebUrl('/forgot-password', args.language)}
and contact support: ${env.EMAIL_REPLY_TO}

— PGFI Shipping`;
  const html = layout({
    title: 'Password changed',
    preheader: 'Security notice',
    bodyHtml: `
      <p>Hello ${esc(args.firstName)},</p>
      <p>Your account password was just changed.</p>
      <p>If this was you, no action is needed.</p>
      <p><strong>If you did not do this,</strong> reset your password right away using “Forgot password” and contact us at ${esc(env.EMAIL_REPLY_TO)}.</p>`,
    ctaUrl: publicWebUrl('/forgot-password', args.language),
    ctaLabel: 'Forgot password',
  });
  return { subject, html, text };
}

import { env } from '../../config/env';
import { esc, layout } from './_helpers';

export function emailVerifiedEmail(args: { firstName: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Your email is verified — PGFI Shipping';
  const text = `Hello ${args.firstName},

Thanks — your email address is now verified for your PGFI Shipping account.

Open your dashboard: ${env.APP_URL}/dashboard

— PGFI Shipping`;
  const html = layout({
    title: 'Email verified',
    preheader: 'You are all set',
    bodyHtml: `
      <p>Hello ${esc(args.firstName)},</p>
      <p>Thanks — your email address is now verified.</p>`,
    ctaUrl: `${env.APP_URL}/dashboard`,
    ctaLabel: 'Go to dashboard',
  });
  return { subject, html, text };
}

import { env } from '../../config/env';
import { esc, layout } from './_helpers';

export interface PackageStatusAlertArgs {
  firstName: string;
  trackingCode: string;
  statusTitle: string;
  message: string;
}

export function packageStatusAlertEmail(args: PackageStatusAlertArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Shipment update — ${args.trackingCode} — ${args.statusTitle}`;
  const trackUrl = `${env.APP_URL}/track/${encodeURIComponent(args.trackingCode)}`;
  const text = `Hi ${args.firstName},

${args.message}

Tracking code: ${args.trackingCode}
Track your package: ${trackUrl}

— PGFI Shipping`;

  const html = layout({
    title: args.statusTitle,
    preheader: `${args.trackingCode}`,
    bodyHtml: `
      <p>Hi ${esc(args.firstName)},</p>
      <p>${esc(args.message)}</p>
      <p style="margin-top:16px"><strong>Tracking:</strong> ${esc(args.trackingCode)}</p>`,
    ctaUrl: trackUrl,
    ctaLabel: 'Track shipment',
  });

  return { subject, html, text };
}

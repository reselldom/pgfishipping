import { env } from '../../config/env';
import { esc, layout } from './_helpers';

export interface PackageDeliveredArgs {
  firstName: string;
  trackingCode: string;
  pickedUpBy?: string | null;
  pickedUpAt?: Date;
}

export function packageDeliveredEmail(args: PackageDeliveredArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `✅ Package delivered — ${args.trackingCode}`;
  const trackUrl = `${env.APP_URL}/track/${args.trackingCode}`;
  const when = args.pickedUpAt ? args.pickedUpAt.toLocaleString() : '';
  const text = `Hi ${args.firstName},

Your package ${args.trackingCode} was successfully picked up${when ? ` on ${when}` : ''}${args.pickedUpBy ? ` by ${args.pickedUpBy}` : ''}.

Thanks for shipping with PGFI! If anything looks wrong, reply to this email or open a support ticket.

${trackUrl}`;

  const html = layout({
    title: 'Package delivered',
    preheader: `Tracking ${args.trackingCode}`,
    bodyHtml: `
      <p>Hi ${esc(args.firstName)},</p>
      <p>Your package <strong>${esc(args.trackingCode)}</strong> was successfully picked up${when ? ` on <strong>${esc(when)}</strong>` : ''}${args.pickedUpBy ? ` by <strong>${esc(args.pickedUpBy)}</strong>` : ''}.</p>
      <p>Thanks for shipping with PGFI! 🇭🇹</p>
      <p style="color:#666;font-size:13px">If anything looks wrong, reply to this email or <a href="${env.APP_URL}/support">open a support ticket</a>.</p>
    `,
    ctaUrl: trackUrl,
    ctaLabel: 'View shipment details',
  });
  return { subject, html, text };
}

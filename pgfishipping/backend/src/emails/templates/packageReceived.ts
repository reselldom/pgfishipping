import { env } from '../../config/env';
import { esc, layout } from './_helpers';

export interface PackageReceivedArgs {
  firstName: string;
  trackingCode: string;
  weightLbs?: number | null;
  contents?: string | null;
  warehouseName?: string | null;
}

export function packageReceivedEmail(args: PackageReceivedArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `📦 Package received at our US warehouse — ${args.trackingCode}`;
  const trackUrl = `${env.APP_URL}/track/${args.trackingCode}`;
  const text = `Hi ${args.firstName},

Great news — we received your package at our US warehouse${args.warehouseName ? ` (${args.warehouseName})` : ''}.

Tracking code: ${args.trackingCode}
${args.weightLbs ? `Weight: ${args.weightLbs.toFixed(2)} lb\n` : ''}${args.contents ? `Contents: ${args.contents}\n` : ''}
We'll notify you as soon as it ships out.

Track it: ${trackUrl}`;

  const html = layout({
    title: 'Package received at our US warehouse',
    preheader: `Tracking ${args.trackingCode}`,
    bodyHtml: `
      <p>Hi ${esc(args.firstName)},</p>
      <p>Great news — we just received your package at our US warehouse${args.warehouseName ? ` (<strong>${esc(args.warehouseName)}</strong>)` : ''}.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#666">Tracking</td><td style="padding:6px 0"><strong>${esc(args.trackingCode)}</strong></td></tr>
        ${args.weightLbs ? `<tr><td style="padding:6px 0;color:#666">Weight</td><td style="padding:6px 0">${args.weightLbs.toFixed(2)} lb</td></tr>` : ''}
        ${args.contents ? `<tr><td style="padding:6px 0;color:#666">Contents</td><td style="padding:6px 0">${esc(args.contents)}</td></tr>` : ''}
      </table>
      <p>We'll send you another update as soon as it ships out toward Haiti.</p>
    `,
    ctaUrl: trackUrl,
    ctaLabel: 'Track this shipment',
  });
  return { subject, html, text };
}

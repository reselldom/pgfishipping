import { env } from '../../config/env';
import { esc, layout } from './_helpers';

export interface ThirdPartyAuthArgs {
  firstName: string;
  trackingCode: string;
  authorizedName: string;
  idType: string;
  idNumber: string;
}

export function thirdPartyAuthEmail(args: ThirdPartyAuthArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Third-party pickup authorization saved — ${args.trackingCode}`;
  const trackUrl = `${env.APP_URL}/track/${args.trackingCode}`;
  const text = `Hi ${args.firstName},

You've authorized the following person to pick up shipment ${args.trackingCode} on your behalf:

Name: ${args.authorizedName}
ID type: ${args.idType}
ID number: ${args.idNumber}

If this wasn't you, contact support immediately.

${trackUrl}`;

  const html = layout({
    title: 'Third-party pickup authorization saved',
    preheader: `Tracking ${args.trackingCode}`,
    bodyHtml: `
      <p>Hi ${esc(args.firstName)},</p>
      <p>You've authorized the following person to pick up shipment <strong>${esc(args.trackingCode)}</strong> on your behalf:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f6f8fb;padding:16px;border-radius:8px">
        <tr><td style="padding:6px 0;color:#666">Name</td><td style="padding:6px 0"><strong>${esc(args.authorizedName)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">ID type</td><td style="padding:6px 0">${esc(args.idType)}</td></tr>
        <tr><td style="padding:6px 0;color:#666">ID number</td><td style="padding:6px 0;font-family:monospace">${esc(args.idNumber)}</td></tr>
      </table>
      <p style="background:#fff8e1;padding:12px;border-radius:6px;color:#8a6d00;font-size:13px">If this wasn't you, please contact support immediately.</p>
    `,
    ctaUrl: trackUrl,
    ctaLabel: 'View shipment',
  });
  return { subject, html, text };
}

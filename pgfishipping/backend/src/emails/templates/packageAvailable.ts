import { env } from '../../config/env';
import { esc, layout } from './_helpers';

export interface PackageAvailableArgs {
  firstName: string;
  trackingCode: string;
  branchName?: string | null;
  branchAddress?: string | null;
  branchPhone?: string | null;
  branchHours?: string | null;
  totalDueUsd?: number | null;
  totalDueHtg?: number | null;
}

export function packageAvailableEmail(args: PackageAvailableArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `🎉 Your package is ready for pickup — ${args.trackingCode}`;
  const trackUrl = `${env.APP_URL}/track/${args.trackingCode}`;
  const due =
    args.totalDueUsd != null
      ? `Total due: $${args.totalDueUsd.toFixed(2)} USD${args.totalDueHtg ? ` (${args.totalDueHtg.toFixed(0)} HTG)` : ''}`
      : '';

  const text = `Hi ${args.firstName},

Great news — your package ${args.trackingCode} has arrived in Haiti and is ready for pickup!

${args.branchName ? `Branch: ${args.branchName}` : ''}
${args.branchAddress ? `Address: ${args.branchAddress}` : ''}
${args.branchPhone ? `Phone: ${args.branchPhone}` : ''}
${args.branchHours ? `Hours: ${args.branchHours}` : ''}
${due}

Bring a valid ID. Track it: ${trackUrl}`;

  const html = layout({
    title: 'Your package is ready for pickup',
    preheader: `Tracking ${args.trackingCode}`,
    bodyHtml: `
      <p>Hi ${esc(args.firstName)},</p>
      <p>Great news — your package <strong>${esc(args.trackingCode)}</strong> has arrived in Haiti and is <strong>ready for pickup</strong>!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f6f8fb;padding:16px;border-radius:8px">
        ${args.branchName ? `<tr><td style="padding:6px 0;color:#666">Branch</td><td style="padding:6px 0"><strong>${esc(args.branchName)}</strong></td></tr>` : ''}
        ${args.branchAddress ? `<tr><td style="padding:6px 0;color:#666">Address</td><td style="padding:6px 0">${esc(args.branchAddress)}</td></tr>` : ''}
        ${args.branchPhone ? `<tr><td style="padding:6px 0;color:#666">Phone</td><td style="padding:6px 0">${esc(args.branchPhone)}</td></tr>` : ''}
        ${args.branchHours ? `<tr><td style="padding:6px 0;color:#666">Hours</td><td style="padding:6px 0">${esc(args.branchHours)}</td></tr>` : ''}
        ${args.totalDueUsd != null ? `<tr><td style="padding:6px 0;color:#666">Total due</td><td style="padding:6px 0"><strong>$${args.totalDueUsd.toFixed(2)} USD${args.totalDueHtg ? ` &middot; ${args.totalDueHtg.toFixed(0)} HTG` : ''}</strong></td></tr>` : ''}
      </table>
      <p style="color:#666;font-size:13px">Please bring a valid government-issued ID. If someone else is picking up the package, they'll need an authorization on file.</p>
    `,
    ctaUrl: trackUrl,
    ctaLabel: 'View shipment',
  });
  return { subject, html, text };
}

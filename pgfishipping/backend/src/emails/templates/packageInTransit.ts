import type { Language } from '@prisma/client';
import { esc, layout } from './_helpers';
import { publicWebUrl } from '../../utils/publicWebUrl';

export interface PackageInTransitArgs {
  firstName: string;
  trackingCode: string;
  serviceType: 'AIR' | 'SEA';
  estimatedArrival?: string | null;
  language?: Language | null;
}

export function packageInTransitEmail(args: PackageInTransitArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `✈️ Your package is on its way to Haiti — ${args.trackingCode}`;
  const trackUrl = publicWebUrl(
    `/track/${encodeURIComponent(args.trackingCode)}`,
    args.language,
  );
  const eta = args.estimatedArrival
    ? `Estimated arrival: ${args.estimatedArrival}`
    : `${args.serviceType === 'AIR' ? 'Air' : 'Sea'} freight typically takes ${args.serviceType === 'AIR' ? '3–5 days' : '15–25 days'}.`;

  const text = `Hi ${args.firstName},

Your package ${args.trackingCode} just left our US warehouse and is now in transit to Haiti via ${args.serviceType === 'AIR' ? 'air freight' : 'sea freight'}.

${eta}

Track it: ${trackUrl}`;

  const html = layout({
    title: 'Your package is in transit',
    preheader: `Tracking ${args.trackingCode}`,
    bodyHtml: `
      <p>Hi ${esc(args.firstName)},</p>
      <p>Your package <strong>${esc(args.trackingCode)}</strong> just left our US warehouse and is now in transit to Haiti via ${args.serviceType === 'AIR' ? 'air freight ✈️' : 'sea freight 🚢'}.</p>
      <p>${esc(eta)}</p>
    `,
    ctaUrl: trackUrl,
    ctaLabel: 'Track this shipment',
  });
  return { subject, html, text };
}

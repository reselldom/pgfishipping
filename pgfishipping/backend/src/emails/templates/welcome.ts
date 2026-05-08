import type { Language } from '@prisma/client';
import { publicWebUrl } from '../../utils/publicWebUrl';

export interface WelcomeEmailArgs {
  firstName: string;
  customerCode: string;
  airAddress: string;
  seaAddress: string;
  language?: Language | null;
}

export function welcomeEmail(args: WelcomeEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Welcome to PGFI Shipping! Your account is ready.';
  const text = `Welcome ${args.firstName}!

Your customer code: ${args.customerCode}

Your US warehouse addresses:

— Air shipments —
${args.airAddress}

— Sea shipments —
${args.seaAddress}

How it works:
1. Order anything online and ship it to your US address above.
2. We receive it, register it in your account, and forward to Haiti.
3. You pick it up from your local PGFI branch.

Login: ${publicWebUrl('/login', args.language)}`;

  const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#0a3d91">Welcome to PGFI Shipping, ${escape(args.firstName)}!</h1>
  <p>Your account is ready. Below are the details you need to start shipping.</p>
  <p style="font-size:18px"><strong>Your customer code:</strong> <code style="background:#f0f4ff;padding:4px 8px;border-radius:4px">${escape(args.customerCode)}</code></p>

  <h2 style="color:#0a3d91;margin-top:32px">Your US warehouse addresses</h2>
  <h3>Air shipments</h3>
  <pre style="background:#f6f8fb;padding:12px;border-radius:6px;font-family:monospace">${escape(args.airAddress)}</pre>
  <h3>Sea shipments</h3>
  <pre style="background:#f6f8fb;padding:12px;border-radius:6px;font-family:monospace">${escape(args.seaAddress)}</pre>

  <h2 style="color:#0a3d91;margin-top:32px">How it works</h2>
  <ol>
    <li>Order anything online and ship it to your US address above.</li>
    <li>We receive it, register it in your account, and forward to Haiti.</li>
    <li>You pick it up from your local PGFI branch.</li>
  </ol>

  <p style="margin-top:32px">
    <a href="${publicWebUrl('/dashboard', args.language)}" style="background:#0a3d91;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Go to your dashboard</a>
  </p>

  <p style="margin-top:32px;color:#666;font-size:13px">— The PGFI Shipping Team</p>
</body></html>`;

  return { subject, html, text };
}

function escape(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

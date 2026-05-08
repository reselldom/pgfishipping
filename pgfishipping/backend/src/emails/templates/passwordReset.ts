import type { Language } from '@prisma/client';
import { publicWebLocaleRoot } from '../../utils/publicWebUrl';

export interface PasswordResetEmailArgs {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
  language?: Language | null;
}

export function passwordResetEmail(args: PasswordResetEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Reset your PGFI Shipping password';
  const text = `Hello ${args.firstName},

You (or someone else) requested a password reset for your PGFI Shipping account.

Click the link below to reset your password (expires in ${args.expiresInMinutes} minutes):
${args.resetUrl}

If you did not request this, you can safely ignore this email — your password will not change.

— The PGFI Shipping Team`;
  const root = publicWebLocaleRoot(args.language);
  const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#0a3d91">Reset your password</h2>
  <p>Hello ${escape(args.firstName)},</p>
  <p>You (or someone else) requested a password reset for your PGFI Shipping account.</p>
  <p>
    <a href="${args.resetUrl}" style="background:#0a3d91;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Reset my password</a>
  </p>
  <p style="color:#666">This link expires in ${args.expiresInMinutes} minutes. If you did not request this, you can safely ignore this email.</p>
  <p style="margin-top:32px;color:#666;font-size:13px">— The PGFI Shipping Team · <a href="${root}">${root}</a></p>
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

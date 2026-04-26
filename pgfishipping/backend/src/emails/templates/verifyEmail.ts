export interface VerifyEmailArgs {
  firstName: string;
  verifyUrl: string;
}

export function verifyEmailTemplate(args: VerifyEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Verify your PGFI Shipping email address';
  const text = `Hello ${args.firstName},

Please verify your email address by visiting:
${args.verifyUrl}

If you did not create an account with PGFI Shipping, ignore this email.

— PGFI Shipping`;
  const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#0a3d91">Verify your email</h2>
  <p>Hello ${escape(args.firstName)},</p>
  <p>Click the button below to confirm your email address and activate your account.</p>
  <p>
    <a href="${args.verifyUrl}" style="background:#0a3d91;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Verify my email</a>
  </p>
  <p style="color:#666">If you did not create an account with PGFI Shipping, ignore this email.</p>
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

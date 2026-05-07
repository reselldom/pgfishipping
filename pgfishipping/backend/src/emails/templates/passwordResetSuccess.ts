import { env } from '../../config/env';
import { esc, layout } from './_helpers';

export function passwordResetSuccessEmail(args: { firstName: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Your PGFI Shipping password was reset';
  const text = `Hello ${args.firstName},

Your password was successfully reset. You can now sign in: ${env.APP_URL}/login

If you did not reset your password, contact support immediately: ${env.EMAIL_REPLY_TO}

— PGFI Shipping`;
  const html = layout({
    title: 'Password reset complete',
    preheader: 'You can sign in now',
    bodyHtml: `
      <p>Hello ${esc(args.firstName)},</p>
      <p>Your password was successfully reset.</p>
      <p>If you did not request this change, contact support immediately at ${esc(env.EMAIL_REPLY_TO)}.</p>`,
    ctaUrl: `${env.APP_URL}/login`,
    ctaLabel: 'Sign in',
  });
  return { subject, html, text };
}

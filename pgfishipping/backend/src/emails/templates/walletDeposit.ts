import type { Language } from '@prisma/client';
import { esc, layout } from './_helpers';
import { publicWebUrl } from '../../utils/publicWebUrl';

export interface WalletDepositArgs {
  firstName: string;
  amountUsd: number;
  newBalanceUsd: number;
  paymentMethod: string;
  reference: string;
  language?: Language | null;
}

export function walletDepositEmail(args: WalletDepositArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `💰 Wallet deposit confirmed — $${args.amountUsd.toFixed(2)} USD`;
  const text = `Hi ${args.firstName},

Your wallet deposit has been confirmed.

Amount: $${args.amountUsd.toFixed(2)} USD
Method: ${args.paymentMethod}
Reference: ${args.reference}
New balance: $${args.newBalanceUsd.toFixed(2)} USD

View wallet: ${publicWebUrl('/dashboard/wallet', args.language)}`;

  const html = layout({
    title: 'Wallet deposit confirmed',
    preheader: `+$${args.amountUsd.toFixed(2)} USD`,
    bodyHtml: `
      <p>Hi ${esc(args.firstName)},</p>
      <p>Your wallet deposit has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f6f8fb;padding:16px;border-radius:8px">
        <tr><td style="padding:6px 0;color:#666">Amount</td><td style="padding:6px 0;text-align:right"><strong style="color:#16a34a">+$${args.amountUsd.toFixed(2)} USD</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Method</td><td style="padding:6px 0;text-align:right">${esc(args.paymentMethod)}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Reference</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px">${esc(args.reference)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;border-top:1px solid #e0e6ee"><strong>New balance</strong></td><td style="padding:6px 0;text-align:right;border-top:1px solid #e0e6ee"><strong>$${args.newBalanceUsd.toFixed(2)} USD</strong></td></tr>
      </table>
    `,
    ctaUrl: publicWebUrl('/dashboard/wallet', args.language),
    ctaLabel: 'View wallet',
  });
  return { subject, html, text };
}

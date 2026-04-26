import { randomBytes } from 'node:crypto';
import {
  CUSTOMER_CODE_PREFIX,
  TRACKING_CODE_LENGTH,
  TRACKING_CODE_PREFIX,
} from '../config/constants';

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateTrackingCode(): string {
  const bytes = randomBytes(TRACKING_CODE_LENGTH);
  let code = TRACKING_CODE_PREFIX;
  for (let i = 0; i < TRACKING_CODE_LENGTH; i++) {
    code += ALNUM.charAt(bytes[i]! % ALNUM.length);
  }
  return code;
}

export function formatCustomerCode(num: number): string {
  return `${CUSTOMER_CODE_PREFIX}${String(num).padStart(6, '0')}`;
}

export function generateReferralCode(): string {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALNUM.charAt(bytes[i]! % ALNUM.length);
  }
  return code;
}

export function generateGiftCardCode(): string {
  const bytes = randomBytes(12);
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += ALNUM.charAt(bytes[i]! % ALNUM.length);
    if ((i + 1) % 4 === 0 && i < 11) code += '-';
  }
  return code;
}

export function generateRandomToken(byteLen = 32): string {
  return randomBytes(byteLen).toString('hex');
}

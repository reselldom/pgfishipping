import { describe, it, expect } from 'vitest';
import {
  formatCustomerCode,
  generateGiftCardCode,
  generateRandomToken,
  generateReferralCode,
  generateTrackingCode,
} from '../../src/utils/generateCode';

describe('generateCode utils', () => {
  it('formatCustomerCode pads to 6 digits', () => {
    expect(formatCustomerCode(1)).toBe('HT-000001');
    expect(formatCustomerCode(1234)).toBe('HT-001234');
    expect(formatCustomerCode(999_999)).toBe('HT-999999');
  });

  it('generateTrackingCode produces PG-XXXXXXXXXX', () => {
    const code = generateTrackingCode();
    expect(code).toMatch(/^PG-[A-Z0-9]{10}$/);
  });

  it('generateTrackingCode is reasonably random', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 200; i++) codes.add(generateTrackingCode());
    expect(codes.size).toBeGreaterThan(195);
  });

  it('generateReferralCode is 8 alphanumerics', () => {
    expect(generateReferralCode()).toMatch(/^[A-Z0-9]{8}$/);
  });

  it('generateGiftCardCode has dashes every 4 chars', () => {
    const c = generateGiftCardCode();
    expect(c).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('generateRandomToken produces hex of expected length', () => {
    const t = generateRandomToken(16);
    expect(t).toMatch(/^[0-9a-f]{32}$/);
  });
});

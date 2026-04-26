export const CUSTOMER_CODE_PREFIX = 'HT-';
export const TRACKING_CODE_PREFIX = 'PG-';
export const TRACKING_CODE_LENGTH = 10;

export const PASSWORD_MIN_LENGTH = 8;
export const BCRYPT_SALT_ROUNDS = 12;

export const FILE_LIMITS = {
  PROFILE_PHOTO_MAX_BYTES: 5 * 1024 * 1024,
  ID_DOC_MAX_BYTES: 5 * 1024 * 1024,
  INVOICE_MAX_BYTES: 10 * 1024 * 1024,
  ALLOWED_PROFILE: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_ID: ['image/jpeg', 'image/png', 'application/pdf'],
  ALLOWED_INVOICE: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
  ],
} as const;

export const WALLET = {
  MIN_DEPOSIT_USD: 5,
  DEFAULT_USD_HTG_RATE: 132.5,
} as const;

// Default per-LB rates from spec section 17 (configurable via PricingRule).
export const DEFAULT_AIR_RATES = {
  freight: 16.936,
  fuel: 3.828,
  airport: 2.03,
  customs: 1.74,
  handling: 0.696,
} as const;

export const DEFAULT_SEA_RATES = {
  freight: 4.5,
  fuel: 0.6,
  airport: 0.4,
  customs: 0.5,
  handling: 0.3,
} as const;

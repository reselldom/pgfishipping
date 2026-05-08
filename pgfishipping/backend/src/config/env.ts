import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  APP_NAME: z.string().default('PGFI Shipping'),
  APP_URL: z.string().url().default('http://localhost:3030'),
  /** First segment under APP_URL for public Next.js routes (must match frontend `defaultLocale`). */
  PUBLIC_WEB_DEFAULT_LOCALE: z.string().default('ht'),
  API_URL: z.string().url().default('http://localhost:4000'),
  ADMIN_URL: z.string().url().default('http://localhost:3001'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('PGFI Shipping <noreply@pgfishipping.com>'),
  EMAIL_REPLY_TO: z.string().default('support@pgfishipping.com'),

  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET_NAME: z.string().optional().default('pgfishipping-files'),
  R2_PUBLIC_URL: z.string().optional().default(''),

  AFTERSHIP_API_KEY: z.string().optional().default(''),
  USPS_USER_ID: z.string().optional().default(''),

  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),

  MONCASH_CLIENT_ID: z.string().optional().default(''),
  MONCASH_CLIENT_SECRET: z.string().optional().default(''),
  MONCASH_MODE: z.enum(['sandbox', 'live']).default('sandbox'),

  NATCASH_MERCHANT_ID: z.string().optional().default(''),
  NATCASH_API_KEY: z.string().optional().default(''),

  EXCHANGE_RATE_API_KEY: z.string().optional().default(''),

  WEBHOOK_SHARED_SECRET: z.string().optional().default('dev-webhook-secret'),

  JOBS_ENABLED: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  TRACKING_POLL_CRON: z.string().default('*/30 * * * *'),
  EXCHANGE_RATE_REFRESH_CRON: z.string().default('0 */6 * * *'),
  WEEKLY_SUMMARY_CRON: z.string().default('0 13 * * 1'),

  SUPER_ADMIN_EMAIL: z.string().email().default('admin@pgfishipping.com'),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe!Now123'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3030,http://localhost:3001'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  DEFAULT_US_WAREHOUSE_ADDRESS: z
    .string()
    .default('8435 NW 68TH ST, MEDLEY, FL 33166'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

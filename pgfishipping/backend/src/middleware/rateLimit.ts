import rateLimit from 'express-rate-limit';
import { env, isDev } from '../config/env';

// Local dev: dashboard pages fire several API calls at once; 100/15min is easy
// to hit while clicking around. Production keeps env-driven limits.
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isDev ? Math.max(env.RATE_LIMIT_MAX, 10_000) : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' },
  },
});

export const authLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts' },
  },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset requests',
    },
  },
});

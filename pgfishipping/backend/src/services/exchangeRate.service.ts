import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { WALLET } from '../config/constants';

const CONFIG_KEY = 'usd_to_htg_rate';
const CONFIG_FETCHED_AT = 'usd_to_htg_rate_fetched_at';
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

// In-memory cache (fast path, avoids hitting DB on every request).
let cached: { rate: number; at: number } | null = null;

export async function getUsdToHtgRate(): Promise<number> {
  const now = Date.now();
  if (cached && now - cached.at < REFRESH_INTERVAL_MS) return cached.rate;

  // Try DB last-known rate.
  const cfg = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
  const fetchedAtCfg = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_FETCHED_AT },
  });
  const lastFetched = fetchedAtCfg ? Number(fetchedAtCfg.value) : 0;
  const dbRate = cfg ? Number(cfg.value) : WALLET.DEFAULT_USD_HTG_RATE;

  if (cfg && now - lastFetched < REFRESH_INTERVAL_MS) {
    cached = { rate: dbRate, at: now };
    return dbRate;
  }

  // Try fetching live (only if API key present); otherwise return DB/default.
  if (env.EXCHANGE_RATE_API_KEY) {
    try {
      const url = `https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/pair/USD/HTG`;
      const r = await fetch(url);
      if (r.ok) {
        const j = (await r.json()) as { result?: string; conversion_rate?: number };
        if (j.result === 'success' && typeof j.conversion_rate === 'number') {
          await prisma.systemConfig.upsert({
            where: { key: CONFIG_KEY },
            update: { value: String(j.conversion_rate) },
            create: { key: CONFIG_KEY, value: String(j.conversion_rate) },
          });
          await prisma.systemConfig.upsert({
            where: { key: CONFIG_FETCHED_AT },
            update: { value: String(now) },
            create: { key: CONFIG_FETCHED_AT, value: String(now) },
          });
          cached = { rate: j.conversion_rate, at: now };
          return j.conversion_rate;
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Exchange rate fetch failed; using fallback');
    }
  }

  cached = { rate: dbRate, at: now };
  return dbRate;
}

export async function setUsdToHtgRate(rate: number): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: String(rate) },
    create: { key: CONFIG_KEY, value: String(rate) },
  });
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_FETCHED_AT },
    update: { value: String(Date.now()) },
    create: { key: CONFIG_FETCHED_AT, value: String(Date.now()) },
  });
  cached = { rate, at: Date.now() };
}

export function clearRateCache(): void {
  cached = null;
}

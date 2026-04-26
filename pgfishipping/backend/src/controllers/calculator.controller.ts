import type { Request, Response } from 'express';
import { z } from 'zod';
import { ContentType, ServiceType } from '@prisma/client';
import { ok } from '../utils/response';
import { estimate, getPublicRates } from '../services/calculator.service';
import { getUsdToHtgRate } from '../services/exchangeRate.service';

export const estimateSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  weightLbs: z.number().positive().max(2000),
  length: z.number().positive().max(500).optional(),
  width: z.number().positive().max(500).optional(),
  height: z.number().positive().max(500).optional(),
  fobValue: z.number().nonnegative().optional(),
  fobCurrency: z.enum(['USD', 'EUR']).optional(),
  contentType: z.nativeEnum(ContentType).optional(),
  specialCategory: z.string().max(40).optional(),
});

export async function estimateCtl(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof estimateSchema>;
  const result = await estimate(body);
  ok(res, result);
}

export async function ratesCtl(_req: Request, res: Response): Promise<void> {
  const data = await getPublicRates();
  ok(res, data);
}

export async function exchangeRateCtl(_req: Request, res: Response): Promise<void> {
  const rate = await getUsdToHtgRate();
  ok(res, { fromCurrency: 'USD', toCurrency: 'HTG', rate });
}

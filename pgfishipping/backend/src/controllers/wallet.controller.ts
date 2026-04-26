import type { Request, Response } from 'express';
import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';
import { Errors, ok } from '../utils/response';
import {
  getBalance,
  initDeposit,
  payShipment,
  redeemGiftCard,
} from '../services/wallet.service';
import { WALLET } from '../config/constants';

export const balanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const depositSchema = z.object({
  amountUsd: z.number().min(WALLET.MIN_DEPOSIT_USD),
  paymentMethod: z.enum(['MONCASH', 'NATCASH', 'PAYMON', 'BANK_TRANSFER']),
});

export const giftCardSchema = z.object({
  code: z.string().min(4).max(40),
});

export const paySchema = z.object({
  shipmentId: z.string().min(1),
  amountUsd: z.number().positive(),
});

export async function balance(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const q = req.query as z.infer<typeof balanceQuerySchema>;
  const data = await getBalance(req.auth.userId, q.page, q.pageSize);
  ok(res, data);
}

export async function deposit(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const body = req.body as z.infer<typeof depositSchema>;
  const data = await initDeposit(
    req.auth.userId,
    body.amountUsd,
    body.paymentMethod as PaymentMethod,
  );
  ok(res, data);
}

export async function redeem(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const body = req.body as z.infer<typeof giftCardSchema>;
  const data = await redeemGiftCard(req.auth.userId, body.code);
  ok(res, data);
}

export async function pay(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const body = req.body as z.infer<typeof paySchema>;
  const data = await payShipment(req.auth.userId, body.shipmentId, body.amountUsd);
  ok(res, data);
}

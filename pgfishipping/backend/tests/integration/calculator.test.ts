import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/config/database';
import { createApp } from '../../src/app';

let app: Express;
let dbAvailable = false;

beforeAll(async () => {
  app = createApp();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    return;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Calculator API', () => {
  it('GET /api/calculator/rates returns AIR + SEA rules', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/calculator/rates');
    expect(res.status).toBe(200);
    expect(res.body.data.air.length).toBeGreaterThan(0);
    expect(res.body.data.sea.length).toBeGreaterThan(0);
  });

  it('GET /api/calculator/exchange-rate returns the USD->HTG rate', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/calculator/exchange-rate');
    expect(res.status).toBe(200);
    expect(res.body.data.fromCurrency).toBe('USD');
    expect(res.body.data.toCurrency).toBe('HTG');
    expect(res.body.data.rate).toBeGreaterThan(0);
  });

  it('POST /api/calculator/estimate AIR sums all rule lines', async () => {
    if (!dbAvailable) return;
    const res = await request(app).post('/api/calculator/estimate').send({
      serviceType: 'AIR',
      weightLbs: 10,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.serviceType).toBe('AIR');
    expect(res.body.data.billableWeightLbs).toBe(10);
    expect(res.body.data.lines.length).toBeGreaterThanOrEqual(5);
    // Per the seeded AIR rates: freight 16.936 + fuel 3.828 + airport 2.030 +
    // customs 1.740 + handling 0.696 = 25.230 per LB → ×10 = 252.30
    expect(res.body.data.subtotalUsd).toBeCloseTo(252.30, 1);
    expect(res.body.data.totalUsd).toBeCloseTo(252.30, 1);
    expect(res.body.data.totalHtg).toBeCloseTo(
      res.body.data.totalUsd * res.body.data.exchangeRate,
      1,
    );
  });

  it('POST /api/calculator/estimate uses dimensional weight when larger', async () => {
    if (!dbAvailable) return;
    // 30 × 30 × 30 / 166 ≈ 162.65 lb dim weight (much larger than 1 lb actual).
    const res = await request(app).post('/api/calculator/estimate').send({
      serviceType: 'AIR',
      weightLbs: 1,
      length: 30,
      width: 30,
      height: 30,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.billableWeightLbs).toBeGreaterThan(160);
  });

  it('POST /api/calculator/estimate validates input', async () => {
    if (!dbAvailable) return;
    const res = await request(app).post('/api/calculator/estimate').send({
      serviceType: 'AIR',
      weightLbs: 0,
    });
    expect(res.status).toBe(422);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/config/database';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';

let app: Express;
let dbAvailable = false;
let token = '';
let userId = '';
let shipmentId = '';

beforeAll(async () => {
  app = createApp();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    return;
  }
  await cleanup();

  const r = await request(app)
    .post('/api/auth/register')
    .send({
      email: `w+${Date.now()}@walltest.local`,
      password: 'Password123!',
      firstName: 'Wallet',
      lastName: 'User',
    });
  token = r.body.data.tokens.accessToken;
  userId = r.body.data.user.id;

  const ship = await request(app)
    .post('/api/shipments/pre-alert')
    .set('Authorization', `Bearer ${token}`)
    .send({ serviceType: 'AIR', weightLbs: 5 });
  shipmentId = ship.body.data.id;
});

async function cleanup() {
  await prisma.transaction.deleteMany({
    where: { wallet: { user: { email: { endsWith: '@walltest.local' } } } },
  });
  await prisma.giftCard.deleteMany({ where: { code: { startsWith: 'GC-TEST' } } });
  await prisma.trackingEvent.deleteMany({
    where: { shipment: { user: { email: { endsWith: '@walltest.local' } } } },
  });
  await prisma.shipment.deleteMany({
    where: { user: { email: { endsWith: '@walltest.local' } } },
  });
  await prisma.notificationLog.deleteMany({
    where: { toEmail: { endsWith: '@walltest.local' } },
  });
  await prisma.usWarehouseAddress.deleteMany({
    where: { user: { email: { endsWith: '@walltest.local' } } },
  });
  await prisma.wallet.deleteMany({
    where: { user: { email: { endsWith: '@walltest.local' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@walltest.local' } },
  });
}

afterAll(async () => {
  if (dbAvailable) await cleanup();
  await prisma.$disconnect();
});

describe('Wallet API', () => {
  it('GET /api/wallet/balance returns 0 USD initially', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.balanceUsd).toBe(0);
    expect(res.body.data.exchangeRate).toBeGreaterThan(0);
    expect(res.body.data.transactions.items).toHaveLength(0);
  });

  it('Deposit flow: init → webhook confirms → balance increases', async () => {
    if (!dbAvailable) return;
    const init = await request(app)
      .post('/api/wallet/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountUsd: 50, paymentMethod: 'MONCASH' });
    expect(init.status).toBe(200);
    expect(init.body.data.reference).toMatch(/^dep_/);

    const reference = init.body.data.reference;

    // Wrong secret → 401
    const wrong = await request(app)
      .post('/api/webhooks/moncash')
      .set('x-webhook-secret', 'WRONG')
      .send({ reference, status: 'success', amount: 50 });
    expect(wrong.status).toBe(401);

    // Correct secret confirms.
    const hook = await request(app)
      .post('/api/webhooks/moncash')
      .set('x-webhook-secret', env.WEBHOOK_SHARED_SECRET ?? 'dev-webhook-secret')
      .send({ reference, status: 'success', amount: 50 });
    expect(hook.status).toBe(200);
    expect(hook.body.data.status).toBe('COMPLETED');

    // Idempotent re-confirmation.
    const hook2 = await request(app)
      .post('/api/webhooks/moncash')
      .set('x-webhook-secret', env.WEBHOOK_SHARED_SECRET ?? 'dev-webhook-secret')
      .send({ reference, status: 'success', amount: 50 });
    expect(hook2.status).toBe(200);

    const bal = await request(app)
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${token}`);
    expect(bal.body.data.balanceUsd).toBe(50);
  });

  it('Pay shipment from wallet deducts balance and marks paid', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .post('/api/wallet/pay-shipment')
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentId, amountUsd: 30 });
    expect(res.status).toBe(200);
    expect(res.body.data.balanceUsd).toBe(20);

    const ship = await request(app)
      .get(`/api/shipments/${shipmentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ship.body.data.paidAt).not.toBeNull();
    expect(ship.body.data.totalCost).toBe(30);

    // Cannot pay twice.
    const second = await request(app)
      .post('/api/wallet/pay-shipment')
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentId, amountUsd: 5 });
    expect(second.status).toBe(400);
  });

  it('Pay shipment fails with insufficient balance', async () => {
    if (!dbAvailable) return;
    const ship = await request(app)
      .post('/api/shipments/pre-alert')
      .set('Authorization', `Bearer ${token}`)
      .send({ serviceType: 'SEA', weightLbs: 1 });
    const sid = ship.body.data.id;
    const res = await request(app)
      .post('/api/wallet/pay-shipment')
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentId: sid, amountUsd: 9999 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Insufficient');
  });

  it('Gift card redeem credits the wallet', async () => {
    if (!dbAvailable) return;
    await prisma.giftCard.create({
      data: {
        code: 'GC-TEST-100',
        valueUsd: 100,
        status: 'ACTIVE',
      },
    });
    const res = await request(app)
      .post('/api/wallet/redeem-gift-card')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'GC-TEST-100' });
    expect(res.status).toBe(200);
    expect(res.body.data.creditedUsd).toBe(100);
    expect(res.body.data.balanceUsd).toBe(120); // was 20, +100

    // Cannot redeem twice.
    const again = await request(app)
      .post('/api/wallet/redeem-gift-card')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'GC-TEST-100' });
    expect(again.status).toBe(400);
  });

  it('Deposit below minimum is rejected', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .post('/api/wallet/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountUsd: 1, paymentMethod: 'MONCASH' });
    expect(res.status).toBe(422); // Zod schema enforces min, returns 422
    void userId;
  });
});

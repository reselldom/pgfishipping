import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/config/database';
import { createApp } from '../../src/app';
import {
  setShipmentStatus,
} from '../../src/services/shipment.service';
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
      email: `n+${Date.now()}@notiftest.local`,
      password: 'Password123!',
      firstName: 'Notif',
      lastName: 'Tester',
    });
  token = r.body.data.tokens.accessToken;
  userId = r.body.data.user.id;

  const ship = await request(app)
    .post('/api/shipments/pre-alert')
    .set('Authorization', `Bearer ${token}`)
    .send({
      serviceType: 'AIR',
      weightLbs: 3,
      contentsDescription: 'Test contents',
      haitiDepartmentKey: 'OUEST',
      haitiDeliveryCity: 'Port-au-Prince',
    });
  shipmentId = ship.body.data.id;
});

async function cleanup() {
  await prisma.notificationLog.deleteMany({
    where: { user: { email: { endsWith: '@notiftest.local' } } },
  });
  await prisma.transaction.deleteMany({
    where: { wallet: { user: { email: { endsWith: '@notiftest.local' } } } },
  });
  await prisma.trackingEvent.deleteMany({
    where: { shipment: { user: { email: { endsWith: '@notiftest.local' } } } },
  });
  await prisma.thirdPartyAuth.deleteMany({
    where: { user: { email: { endsWith: '@notiftest.local' } } },
  });
  await prisma.shipment.deleteMany({
    where: { user: { email: { endsWith: '@notiftest.local' } } },
  });
  await prisma.usWarehouseAddress.deleteMany({
    where: { user: { email: { endsWith: '@notiftest.local' } } },
  });
  await prisma.wallet.deleteMany({
    where: { user: { email: { endsWith: '@notiftest.local' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@notiftest.local' } },
  });
}

afterAll(async () => {
  if (dbAvailable) await cleanup();
  await prisma.$disconnect();
});

async function waitForLog(template: string, ms = 2000): Promise<unknown> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const log = await prisma.notificationLog.findFirst({
      where: { userId, template },
      orderBy: { createdAt: 'desc' },
    });
    if (log) return log;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

describe('Notifications (email + NotificationLog)', () => {
  it('Welcome email logged on registration', async () => {
    if (!dbAvailable) return;
    const log = await waitForLog('welcome');
    expect(log).not.toBeNull();
    expect((log as { status: string }).status).toBe('sent');
  });

  it('setShipmentStatus(RECEIVED) writes a tracking event and sends package_received', async () => {
    if (!dbAvailable) return;
    const before = await prisma.trackingEvent.count({ where: { shipmentId } });

    await setShipmentStatus(shipmentId, {
      status: 'RECEIVED',
      location: 'US Warehouse - Medley',
      source: 'admin',
    });

    const after = await prisma.trackingEvent.count({ where: { shipmentId } });
    expect(after).toBe(before + 1);

    const log = await waitForLog('package_received');
    expect(log).not.toBeNull();

    const ship = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    expect(ship?.status).toBe('RECEIVED');
  });

  it('IN_TRANSIT → AVAILABLE → DELIVERED each fire their own email and event', async () => {
    if (!dbAvailable) return;

    await setShipmentStatus(shipmentId, { status: 'IN_TRANSIT' });
    expect(await waitForLog('package_in_transit')).not.toBeNull();

    await setShipmentStatus(shipmentId, { status: 'AVAILABLE' });
    expect(await waitForLog('package_available')).not.toBeNull();

    await setShipmentStatus(shipmentId, { status: 'DELIVERED' });
    expect(await waitForLog('package_delivered')).not.toBeNull();

    const final = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    expect(final?.status).toBe('DELIVERED');
    expect(final?.deliveredAt).not.toBeNull();
  });

  it('setShipmentStatus is idempotent (same status = no extra event)', async () => {
    if (!dbAvailable) return;
    const before = await prisma.trackingEvent.count({ where: { shipmentId } });
    await setShipmentStatus(shipmentId, { status: 'DELIVERED' });
    const after = await prisma.trackingEvent.count({ where: { shipmentId } });
    expect(after).toBe(before);
  });

  it('Wallet deposit confirmation triggers a wallet_deposit email', async () => {
    if (!dbAvailable) return;
    const init = await request(app)
      .post('/api/wallet/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountUsd: 25, paymentMethod: 'MONCASH' });
    expect(init.status).toBe(200);

    const hook = await request(app)
      .post('/api/webhooks/moncash')
      .set('x-webhook-secret', env.WEBHOOK_SHARED_SECRET ?? 'dev-webhook-secret')
      .send({ reference: init.body.data.reference, status: 'success', amount: 25 });
    expect(hook.status).toBe(200);

    expect(await waitForLog('wallet_deposit')).not.toBeNull();
    void userId;
  });

  it('Setting third-party authorization triggers a third_party_auth email', async () => {
    if (!dbAvailable) return;
    const r = await request(app)
      .post(`/api/shipments/${shipmentId}/authorize`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        authorizedName: 'Pierre Joseph',
        idType: 'cedula',
        idNumber: '999-111-222',
        phone: '+509 0000 0000',
      });
    expect(r.status).toBe(200);
    expect(await waitForLog('third_party_auth')).not.toBeNull();
  });
});

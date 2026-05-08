import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/config/database';
import { createApp } from '../../src/app';

let app: Express;
let dbAvailable = false;
let token = '';
let userId = '';
let token2 = '';

beforeAll(async () => {
  app = createApp();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    return;
  }

  await cleanup();

  const r1 = await request(app)
    .post('/api/auth/register')
    .send({
      email: `s1+${Date.now()}@shiptest.local`,
      password: 'Password123!',
      firstName: 'Shipper',
      lastName: 'One',
    });
  token = r1.body.data.tokens.accessToken;
  userId = r1.body.data.user.id;

  const r2 = await request(app)
    .post('/api/auth/register')
    .send({
      email: `s2+${Date.now()}@shiptest.local`,
      password: 'Password123!',
      firstName: 'Shipper',
      lastName: 'Two',
    });
  token2 = r2.body.data.tokens.accessToken;
});

async function cleanup() {
  await prisma.trackingEvent.deleteMany({
    where: { shipment: { user: { email: { endsWith: '@shiptest.local' } } } },
  });
  await prisma.thirdPartyAuth.deleteMany({
    where: { user: { email: { endsWith: '@shiptest.local' } } },
  });
  await prisma.shipment.deleteMany({
    where: { user: { email: { endsWith: '@shiptest.local' } } },
  });
  await prisma.notificationLog.deleteMany({
    where: { toEmail: { endsWith: '@shiptest.local' } },
  });
  await prisma.usWarehouseAddress.deleteMany({
    where: { user: { email: { endsWith: '@shiptest.local' } } },
  });
  await prisma.wallet.deleteMany({
    where: { user: { email: { endsWith: '@shiptest.local' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@shiptest.local' } },
  });
}

afterAll(async () => {
  if (dbAvailable) await cleanup();
  await prisma.$disconnect();
});

describe('Shipment API', () => {
  let firstShipmentId = '';
  let firstTrackingCode = '';

  it('POST /api/shipments/pre-alert creates a shipment with PG- code', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .post('/api/shipments/pre-alert')
      .set('Authorization', `Bearer ${token}`)
      .send({
        externalTracking: '1ZTEST123',
        externalCarrier: 'UPS',
        serviceType: 'AIR',
        contentsDescription: 'Laptop',
        weightLbs: 4.5,
        fobValue: 1200,
        vendor: 'Amazon',
        haitiDepartmentKey: 'OUEST',
        haitiDeliveryCity: 'Port-au-Prince',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.trackingCode).toMatch(/^PG-[A-Z0-9]{10}$/);
    expect(res.body.data.status).toBe('WAITING');
    firstShipmentId = res.body.data.id;
    firstTrackingCode = res.body.data.trackingCode;

    // Initial tracking event was created.
    const events = await prisma.trackingEvent.findMany({
      where: { shipmentId: firstShipmentId },
    });
    expect(events.length).toBe(1);
  });

  it('GET /api/shipments lists own shipments only', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .get('/api/shipments?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].trackingCode).toMatch(/^PG-/);
    expect(res.body.meta.pagination.total).toBeGreaterThan(0);

    const other = await request(app)
      .get('/api/shipments')
      .set('Authorization', `Bearer ${token2}`);
    expect(other.status).toBe(200);
    expect(other.body.data.length).toBe(0);
  });

  it('GET /api/shipments/:id returns owner detail; forbidden for others', async () => {
    if (!dbAvailable) return;
    const ok = await request(app)
      .get(`/api/shipments/${firstShipmentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.trackingCode).toBe(firstTrackingCode);
    expect(ok.body.data.trackingEvents.length).toBe(1);

    const denied = await request(app)
      .get(`/api/shipments/${firstShipmentId}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(denied.status).toBe(403);
  });

  it('PUT /api/shipments/:id/fob updates the FOB', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .put(`/api/shipments/${firstShipmentId}/fob`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fobValue: 999.99, fobCurrency: 'USD' });
    expect(res.status).toBe(200);
    expect(res.body.data.fobValue).toBe(999.99);
  });

  it('POST /api/shipments/:id/authorize stores 3rd-party auth', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .post(`/api/shipments/${firstShipmentId}/authorize`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        authorizedName: 'Pierre Joseph',
        idType: 'cedula',
        idNumber: '123-456-789',
        phone: '+509 1234 5678',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.authorizedName).toBe('Pierre Joseph');

    const got = await request(app)
      .get(`/api/shipments/${firstShipmentId}/authorize`)
      .set('Authorization', `Bearer ${token}`);
    expect(got.status).toBe(200);
    expect(got.body.data.authorizedName).toBe('Pierre Joseph');
  });

  it('GET /api/track/:code (public) works for both internal and external codes', async () => {
    if (!dbAvailable) return;
    const byInternal = await request(app).get(
      `/api/track/${firstTrackingCode}`,
    );
    expect(byInternal.status).toBe(200);
    expect(byInternal.body.data.step).toBe(0); // WAITING
    expect(byInternal.body.data.events.length).toBeGreaterThan(0);

    const byExternal = await request(app).get('/api/track/1ZTEST123');
    expect(byExternal.status).toBe(200);
    expect(byExternal.body.data.trackingCode).toBe(firstTrackingCode);

    const notFound = await request(app).get('/api/track/PG-DOESNOTEXIST');
    expect(notFound.status).toBe(404);
  });

  it('POST /api/shipments/merge groups multiple shipments under a mergeGroupId', async () => {
    if (!dbAvailable) return;
    const r = await request(app)
      .post('/api/shipments/pre-alert')
      .set('Authorization', `Bearer ${token}`)
      .send({
        serviceType: 'SEA',
        contentsDescription: 'Tires',
        haitiDepartmentKey: 'OUEST',
        haitiDeliveryCity: 'Port-au-Prince',
      });
    const secondId = r.body.data.id;

    const merged = await request(app)
      .post('/api/shipments/merge')
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentIds: [firstShipmentId, secondId] });
    expect(merged.status).toBe(200);
    expect(merged.body.data.count).toBe(2);
    expect(merged.body.data.mergeGroupId).toMatch(/^mg_/);
  });

  it('GET /api/shipments/:id/label returns a PDF', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .get(`/api/shipments/${firstShipmentId}/label`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('pdf');
    // PDF magic bytes start with "%PDF-"
    expect(res.body.toString('utf8', 0, 5)).toBe('%PDF-');
    expect(res.body.length).toBeGreaterThan(1000);
  });
});

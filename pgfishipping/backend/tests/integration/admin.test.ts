import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/config/database';
import { createApp } from '../../src/app';
import { signAccessToken } from '../../src/middleware/auth';
import { generateReferralCode } from '../../src/utils/generateCode';

let app: Express;
let dbAvailable = false;
let adminToken = '';
let customerToken = '';
let customerId = '';
let shipmentId = '';
let pricingRuleId = '';
let warehouseId = '';
let giftCardId = '';
let staffId = '';

beforeAll(async () => {
  app = createApp();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    return;
  }
  await cleanup();

  const passwordHash = await bcrypt.hash('AdminPass123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: `admin+${Date.now()}@admintest.local`,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Tester',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      customerCode: `A${Date.now().toString().slice(-6)}`,
      referralCode: generateReferralCode(),
    },
  });
  adminToken = signAccessToken({
    sub: admin.id,
    code: admin.customerCode,
    role: admin.role,
    email: admin.email,
  });

  const customerRes = await request(app)
    .post('/api/auth/register')
    .send({
      email: `cust+${Date.now()}@admintest.local`,
      password: 'Password123!',
      firstName: 'Customer',
      lastName: 'Tester',
    });
  customerToken = customerRes.body.data.tokens.accessToken;
  customerId = customerRes.body.data.user.id;

  const ship = await request(app)
    .post('/api/shipments/pre-alert')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      serviceType: 'AIR',
      weightLbs: 4,
      contentsDescription: 'Test contents for admin',
      haitiDepartmentKey: 'OUEST',
      haitiDeliveryCity: 'Port-au-Prince',
    });
  shipmentId = ship.body.data.id;
});

async function cleanup() {
  await prisma.notificationLog.deleteMany({
    where: { user: { email: { endsWith: '@admintest.local' } } },
  });
  await prisma.transaction.deleteMany({
    where: { wallet: { user: { email: { endsWith: '@admintest.local' } } } },
  });
  await prisma.trackingEvent.deleteMany({
    where: { shipment: { user: { email: { endsWith: '@admintest.local' } } } },
  });
  await prisma.shipment.deleteMany({
    where: { user: { email: { endsWith: '@admintest.local' } } },
  });
  await prisma.usWarehouseAddress.deleteMany({
    where: { user: { email: { endsWith: '@admintest.local' } } },
  });
  await prisma.wallet.deleteMany({
    where: { user: { email: { endsWith: '@admintest.local' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@admintest.local' } },
  });
  await prisma.staff.deleteMany({
    where: { email: { endsWith: '@admintest.local' } },
  });
  await prisma.pricingRule.deleteMany({
    where: { name: { startsWith: '__admintest_' } },
  });
  await prisma.warehouse.deleteMany({
    where: { name: { startsWith: '__admintest_' } },
  });
}

afterAll(async () => {
  if (dbAvailable) await cleanup();
  await prisma.$disconnect();
});

describe('Admin API', () => {
  it('Non-admin token cannot access /api/admin/*', async () => {
    if (!dbAvailable) return;
    const r = await request(app)
      .get('/api/admin/customers')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(r.status).toBe(403);
  });

  it('No token returns 401', async () => {
    if (!dbAvailable) return;
    const r = await request(app).get('/api/admin/customers');
    expect(r.status).toBe(401);
  });

  it('Analytics dashboard returns aggregates', async () => {
    if (!dbAvailable) return;
    const r = await request(app)
      .get('/api/admin/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.data.customers.total).toBeGreaterThan(0);
    expect(typeof r.body.data.shipments.total).toBe('number');
    expect(typeof r.body.data.revenue.last30dUsd).toBe('number');
  });

  it('Customer list + detail + status update + wallet adjustment', async () => {
    if (!dbAvailable) return;

    const list = await request(app)
      .get('/api/admin/customers?search=admintest')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);

    const detail = await request(app)
      .get(`/api/admin/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.user.id).toBe(customerId);
    expect(detail.body.data.stats.shipmentCount).toBeGreaterThanOrEqual(1);

    const status = await request(app)
      .patch(`/api/admin/customers/${customerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });
    expect(status.status).toBe(200);
    expect(status.body.data.status).toBe('SUSPENDED');

    const credit = await request(app)
      .post(`/api/admin/customers/${customerId}/adjust-wallet`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amountUsd: 15.5, reason: 'goodwill credit' });
    expect(credit.status).toBe(201);
    expect(credit.body.data.amount).toBe(15.5);

    const wallet = await prisma.wallet.findUnique({ where: { userId: customerId } });
    expect(wallet?.balanceUsd).toBe(15.5);
  });

  it('Shipment list, update, add tracking event, bulk status', async () => {
    if (!dbAvailable) return;

    const list = await request(app)
      .get('/api/admin/shipments?search=admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);

    const upd = await request(app)
      .patch(`/api/admin/shipments/${shipmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ weightLbs: 5.25, vendor: 'Amazon' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.weightLbs).toBe(5.25);
    expect(upd.body.data.vendor).toBe('Amazon');

    const evt = await request(app)
      .post(`/api/admin/shipments/${shipmentId}/events`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RECEIVED', location: 'Medley, FL' });
    expect(evt.status).toBe(201);

    const bulk = await request(app)
      .post('/api/admin/shipments/bulk-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ shipmentIds: [shipmentId], status: 'IN_TRANSIT' });
    expect(bulk.status).toBe(200);
    expect(bulk.body.data.updated).toBe(1);
  });

  it('Pricing rule CRUD', async () => {
    if (!dbAvailable) return;

    const create = await request(app)
      .post('/api/admin/pricing')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '__admintest_freight',
        serviceType: 'AIR',
        feeType: 'freight',
        ratePerLb: 4.99,
      });
    expect(create.status).toBe(201);
    pricingRuleId = create.body.data.id;

    const update = await request(app)
      .patch(`/api/admin/pricing/${pricingRuleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ratePerLb: 5.25 });
    expect(update.status).toBe(200);
    expect(update.body.data.ratePerLb).toBe(5.25);

    const del = await request(app)
      .delete(`/api/admin/pricing/${pricingRuleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('Warehouse CRUD', async () => {
    if (!dbAvailable) return;

    const create = await request(app)
      .post('/api/admin/warehouses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '__admintest_branch',
        type: 'haiti-branch',
        address: '12 Rue Test',
        city: 'Port-au-Prince',
        country: 'HT',
      });
    expect(create.status).toBe(201);
    warehouseId = create.body.data.id;

    const update = await request(app)
      .patch(`/api/admin/warehouses/${warehouseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '+509 0000 0000' });
    expect(update.status).toBe(200);

    const del = await request(app)
      .delete(`/api/admin/warehouses/${warehouseId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('Gift card issue → list → void', async () => {
    if (!dbAvailable) return;

    const issue = await request(app)
      .post('/api/admin/gift-cards')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ valueUsd: 25, issuedTo: 'admintest-recipient' });
    expect(issue.status).toBe(201);
    giftCardId = issue.body.data.id;
    expect(issue.body.data.code).toMatch(/^[A-Z0-9]+$/);

    const list = await request(app)
      .get('/api/admin/gift-cards?status=ACTIVE')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);

    const voidR = await request(app)
      .post(`/api/admin/gift-cards/${giftCardId}/void`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(voidR.status).toBe(200);
    expect(voidR.body.data.status).toBe('CANCELLED');
  });

  it('System config set/list/delete', async () => {
    if (!dbAvailable) return;

    const set = await request(app)
      .put('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: '__admintest_key', value: 'hello' });
    expect(set.status).toBe(200);
    expect(set.body.data.value).toBe('hello');

    const list = await request(app)
      .get('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    const found = list.body.data.find(
      (c: { key: string }) => c.key === '__admintest_key',
    );
    expect(found?.value).toBe('hello');

    const del = await request(app)
      .delete('/api/admin/config/__admintest_key')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('Staff CRUD (SUPER_ADMIN allowed)', async () => {
    if (!dbAvailable) return;

    const create = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Staff Tester',
        email: `staff+${Date.now()}@admintest.local`,
        password: 'StaffPass1!',
        role: 'WAREHOUSE_STAFF',
      });
    expect(create.status).toBe(201);
    expect(create.body.data.passwordHash).toBeUndefined();
    staffId = create.body.data.id;

    const upd = await request(app)
      .patch(`/api/admin/staff/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Staff Tester Renamed' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.name).toBe('Staff Tester Renamed');

    const deact = await request(app)
      .post(`/api/admin/staff/${staffId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deact.status).toBe(200);
    expect(deact.body.data.isActive).toBe(false);
  });

  it('Broadcast preview returns recipient count', async () => {
    if (!dbAvailable) return;
    const r = await request(app)
      .post('/api/admin/broadcast/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Test',
        bodyHtml: '<p>Hi</p>',
        segment: 'all',
      });
    expect(r.status).toBe(200);
    expect(typeof r.body.data.count).toBe('number');
  });
});

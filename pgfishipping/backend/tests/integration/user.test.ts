import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/config/database';
import { createApp } from '../../src/app';

let app: Express;
let dbAvailable = false;
let token = '';
let customerCode = '';

beforeAll(async () => {
  app = createApp();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    return;
  }

  await prisma.notificationLog.deleteMany({
    where: { toEmail: { endsWith: '@usertest.local' } },
  });
  await prisma.usWarehouseAddress.deleteMany({
    where: { user: { email: { endsWith: '@usertest.local' } } },
  });
  await prisma.wallet.deleteMany({
    where: { user: { email: { endsWith: '@usertest.local' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@usertest.local' } },
  });

  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `usertest+${Date.now()}@usertest.local`,
      password: 'Password123!',
      firstName: 'Marie',
      lastName: 'Joseph',
    });
  token = res.body.data.tokens.accessToken;
  customerCode = res.body.data.user.customerCode;
});

afterAll(async () => {
  if (dbAvailable) {
    await prisma.notificationLog.deleteMany({
      where: { toEmail: { endsWith: '@usertest.local' } },
    });
    await prisma.usWarehouseAddress.deleteMany({
      where: { user: { email: { endsWith: '@usertest.local' } } },
    });
    await prisma.wallet.deleteMany({
      where: { user: { email: { endsWith: '@usertest.local' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@usertest.local' } },
    });
  }
  await prisma.$disconnect();
});

describe('User API', () => {
  it('GET /api/user/me requires auth', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/user/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/user/me returns the authenticated profile', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .get('/api/user/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.customerCode).toBe(customerCode);
    expect(res.body.data.firstName).toBe('Marie');
  });

  it('PUT /api/user/profile updates fields and warehouse label', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Mariah',
        phoneCell: '+509 1234 5678',
        language: 'FR',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Mariah');

    const addr = await request(app)
      .get('/api/user/address')
      .set('Authorization', `Bearer ${token}`);
    expect(addr.status).toBe(200);
    expect(addr.body.data.airAddress).toContain(`Mariah Joseph/${customerCode}/A`);
    expect(addr.body.data.seaAddress).toContain(`Mariah Joseph/${customerCode}/B`);
  });

  it('GET /api/user/data returns a JSON export with no secrets', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .get('/api/user/data')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(body.user.email).toContain('@usertest.local');
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('POST /api/user/photo accepts a JPG and returns a URL', async () => {
    if (!dbAvailable) return;
    // 1x1 JPEG (smallest valid)
    const tinyJpg = Buffer.from(
      [
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
        0x37, 0xff, 0xd9,
      ],
    );
    const res = await request(app)
      .post('/api/user/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyJpg, { filename: 'p.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toMatch(/profile\.jpg$/);
  });

  it('POST /api/user/photo rejects unsupported mime types', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .post('/api/user/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello'), {
        filename: 'p.exe',
        contentType: 'application/x-msdownload',
      });
    expect(res.status).toBe(415);
  });
});

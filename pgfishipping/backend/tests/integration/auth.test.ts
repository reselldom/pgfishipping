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
    dbAvailable = false;
    // eslint-disable-next-line no-console
    console.warn('⚠ Skipping integration tests: DB unreachable. Run docker compose up -d.');
    return;
  }
  // Clean test data (only rows with the @itest. domain).
  await prisma.notificationLog.deleteMany({ where: { toEmail: { endsWith: '@itest.local' } } });
  await prisma.usWarehouseAddress.deleteMany({
    where: { user: { email: { endsWith: '@itest.local' } } },
  });
  await prisma.wallet.deleteMany({
    where: { user: { email: { endsWith: '@itest.local' } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@itest.local' } } });
});

afterAll(async () => {
  if (dbAvailable) {
    await prisma.notificationLog.deleteMany({ where: { toEmail: { endsWith: '@itest.local' } } });
    await prisma.usWarehouseAddress.deleteMany({
      where: { user: { email: { endsWith: '@itest.local' } } },
    });
    await prisma.wallet.deleteMany({
      where: { user: { email: { endsWith: '@itest.local' } } },
    });
    await prisma.user.deleteMany({ where: { email: { endsWith: '@itest.local' } } });
  }
  await prisma.$disconnect();
});

describe('Auth API', () => {
  it('GET /api/health returns ok with DB check', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.checks.database.ok).toBe(true);
  });

  it('POST /api/auth/register validates input', async () => {
    if (!dbAvailable) return;
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'short',
      firstName: '',
      lastName: '',
    });
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
  });

  it('register → login → /me flow', async () => {
    if (!dbAvailable) return;

    const email = `marie+${Date.now()}@itest.local`;
    const password = 'Password123!';

    // Register
    const reg = await request(app).post('/api/auth/register').send({
      email,
      password,
      firstName: 'Marie',
      lastName: 'Joseph',
      language: 'EN',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.ok).toBe(true);
    expect(reg.body.data.user.customerCode).toMatch(/^HT-\d{6}$/);
    expect(reg.body.data.user.referralCode).toMatch(/^[A-Z0-9]{8}$/);
    expect(reg.body.data.tokens.accessToken).toBeTruthy();

    const access = reg.body.data.tokens.accessToken as string;
    const refresh = reg.body.data.tokens.refreshToken as string;
    const customerCode = reg.body.data.user.customerCode as string;

    // Wallet + warehouse address should have been created.
    const userId = reg.body.data.user.id as string;
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    expect(wallet).not.toBeNull();

    const usAddr = await prisma.usWarehouseAddress.findUnique({
      where: { userId },
    });
    expect(usAddr).not.toBeNull();
    expect(usAddr?.airAddress).toContain(`${customerCode}/A`);
    expect(usAddr?.seaAddress).toContain(`${customerCode}/B`);

    // Duplicate email should 409.
    const dup = await request(app).post('/api/auth/register').send({
      email,
      password,
      firstName: 'Marie',
      lastName: 'Joseph',
    });
    expect(dup.status).toBe(409);

    // Login by email
    const login1 = await request(app).post('/api/auth/login').send({
      identifier: email,
      password,
    });
    expect(login1.status).toBe(200);
    expect(login1.body.data.tokens.accessToken).toBeTruthy();

    // Login by customer code
    const login2 = await request(app).post('/api/auth/login').send({
      identifier: customerCode,
      password,
    });
    expect(login2.status).toBe(200);

    // Wrong password
    const badLogin = await request(app).post('/api/auth/login').send({
      identifier: email,
      password: 'WrongPassword1',
    });
    expect(badLogin.status).toBe(401);

    // Refresh
    const ref = await request(app).post('/api/auth/refresh').send({ refreshToken: refresh });
    expect(ref.status).toBe(200);
    expect(ref.body.data.tokens.accessToken).toBeTruthy();

    // Change password requires auth
    const cp = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${access}`)
      .send({ currentPassword: password, newPassword: 'NewPassword123!' });
    expect(cp.status).toBe(200);

    // Old password should now fail.
    const reLogin = await request(app).post('/api/auth/login').send({
      identifier: email,
      password,
    });
    expect(reLogin.status).toBe(401);

    // New password works.
    const ok2 = await request(app).post('/api/auth/login').send({
      identifier: email,
      password: 'NewPassword123!',
    });
    expect(ok2.status).toBe(200);
  });

  it('forgot-password always 200, reset-password works with valid token', async () => {
    if (!dbAvailable) return;

    const email = `reset+${Date.now()}@itest.local`;
    await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Password123!',
        firstName: 'Reset',
        lastName: 'Tester',
      })
      .expect(201);

    // Forgot — non-existent email also returns 200.
    const fp = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@itest.local' });
    expect(fp.status).toBe(200);

    const fp2 = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email });
    expect(fp2.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.resetToken).toBeTruthy();

    const newPwd = 'BrandNew123!';
    const reset = await request(app).post('/api/auth/reset-password').send({
      token: user!.resetToken!,
      password: newPwd,
    });
    expect(reset.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({
      identifier: email,
      password: newPwd,
    });
    expect(login.status).toBe(200);
  });
});

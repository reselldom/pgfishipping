import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { BCRYPT_SALT_ROUNDS, PASSWORD_MIN_LENGTH } from '../config/constants';
import { env } from '../config/env';
import { Errors } from '../utils/response';
import { generateRandomToken, generateReferralCode } from '../utils/generateCode';
import {
  allocateCustomerCode,
  buildWarehouseAddress,
  warehouseToShipmentAddressString,
  resolvePhysicalWarehouseLineForCustomer,
  refreshUsWarehouseAddressStringsForUserId,
} from './customerCode.service';
import { signAccessToken, signRefreshToken } from '../middleware/auth';
import { sendEmail } from './email.service';
import { welcomeEmail } from '../emails/templates/welcome';
import { passwordResetEmail } from '../emails/templates/passwordReset';
import { verifyEmailTemplate } from '../emails/templates/verifyEmail';
import type { Language, User } from '@prisma/client';
import { logger } from '../utils/logger';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneCell?: string;
  phoneHome?: string;
  language?: Language;
  referralCode?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface PublicUser {
  id: string;
  customerCode: string;
  email: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  status: User['status'];
  language: Language;
  emailVerified: boolean;
  referralCode: string;
  loyaltyPoints: number;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    customerCode: u.customerCode,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    status: u.status,
    language: u.language,
    emailVerified: u.emailVerified,
    referralCode: u.referralCode,
    loyaltyPoints: u.loyaltyPoints,
  };
}

export function validatePassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw Errors.unprocessable(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }
  if (!/[A-Z]/.test(password)) {
    throw Errors.unprocessable('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw Errors.unprocessable('Password must contain at least one digit');
  }
}

export async function registerCustomer(input: RegisterInput): Promise<AuthResult> {
  validatePassword(input.password);

  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Errors.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const emailVerifyToken = generateRandomToken(24);

  let referrer: User | null = null;
  if (input.referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode: input.referralCode.toUpperCase() },
    });
  }

  const user = await prisma.$transaction(async (tx) => {
    const customerCode = await allocateCustomerCode(tx);
    const referralCode = await generateUniqueReferralCode(tx);

    const created = await tx.user.create({
      data: {
        customerCode,
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phoneCell: input.phoneCell?.trim() ?? null,
        phoneHome: input.phoneHome?.trim() ?? null,
        language: input.language ?? 'EN',
        referralCode,
        referredById: referrer?.id ?? null,
        emailVerifyToken,
        status: 'PENDING_VERIFICATION',
      },
    });

    const primaryUs = await tx.warehouse.findFirst({
      where: { type: 'US', isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const warehouseLine =
      primaryUs !== null
        ? warehouseToShipmentAddressString(primaryUs)
        : env.DEFAULT_US_WAREHOUSE_ADDRESS;

    const { airAddress, seaAddress } = buildWarehouseAddress({
      customerCode,
      firstName: created.firstName,
      lastName: created.lastName,
      warehouseAddress: warehouseLine,
    });

    await tx.usWarehouseAddress.create({
      data: {
        userId: created.id,
        aptNumber: customerCode,
        airAddress,
        seaAddress,
        warehouseId: primaryUs?.id ?? null,
      },
    });

    await tx.wallet.create({ data: { userId: created.id } });

    if (referrer) {
      await tx.referral.create({
        data: { referrerId: referrer.id, referredId: created.id },
      });
    }

    return created;
  });

  // Send welcome email + verification email (non-blocking failure).
  void sendWelcomeAndVerification(user).catch((err) =>
    logger.error({ err, userId: user.id }, 'Failed to send welcome email'),
  );

  const tokens = issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

async function sendWelcomeAndVerification(user: User): Promise<void> {
  const usAddress = await prisma.usWarehouseAddress.findUnique({
    where: { userId: user.id },
  });
  if (!usAddress) return;
  const welcome = welcomeEmail({
    firstName: user.firstName,
    customerCode: user.customerCode,
    airAddress: usAddress.airAddress,
    seaAddress: usAddress.seaAddress,
  });
  await sendEmail({
    to: user.email,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
    template: 'welcome',
  });
  await persistNotificationLog(user.id, 'welcome', user.email, welcome.subject);

  if (user.emailVerifyToken) {
    const verifyUrl = `${env.APP_URL}/verify-email?token=${user.emailVerifyToken}`;
    const verify = verifyEmailTemplate({
      firstName: user.firstName,
      verifyUrl,
    });
    await sendEmail({
      to: user.email,
      subject: verify.subject,
      html: verify.html,
      text: verify.text,
      template: 'verifyEmail',
    });
    await persistNotificationLog(
      user.id,
      'verifyEmail',
      user.email,
      verify.subject,
    );
  }
}

async function persistNotificationLog(
  userId: string,
  template: string,
  toEmail: string,
  subject: string,
): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: { userId, channel: 'EMAIL', template, toEmail, subject },
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to write notification log');
  }
}

async function generateUniqueReferralCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const exists = await tx.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  return generateReferralCode() + Date.now().toString(36).toUpperCase();
}

function issueTokens(user: User): AuthTokens {
  const claims = {
    sub: user.id,
    code: user.customerCode,
    role: user.role,
    email: user.email,
  };
  return {
    accessToken: signAccessToken(claims),
    refreshToken: signRefreshToken(claims),
  };
}

export interface LoginInput {
  identifier: string; // email OR customer code
  password: string;
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const id = input.identifier.trim();
  const lookup = id.startsWith('HT-')
    ? { customerCode: id.toUpperCase() }
    : { email: id.toLowerCase() };

  const user = await prisma.user.findUnique({ where: lookup });
  if (!user || user.deletedAt) {
    throw Errors.unauthorized('Invalid credentials');
  }
  if (user.status === 'SUSPENDED') {
    throw Errors.forbidden('Account suspended. Contact support.');
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw Errors.unauthorized('Invalid credentials');

  const tokens = issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

export async function refreshSession(refreshToken: string): Promise<AuthTokens> {
  // verifyToken throws on invalid/expired
  const { verifyToken } = await import('../middleware/auth');
  const claims = verifyToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.deletedAt || user.status === 'SUSPENDED') {
    throw Errors.unauthorized('Session no longer valid');
  }
  return issueTokens(user);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  // Always succeed (don't leak account existence).
  if (!user || user.deletedAt) return;

  const token = generateRandomToken(32);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expires },
  });

  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  const tpl = passwordResetEmail({
    firstName: user.firstName,
    resetUrl,
    expiresInMinutes: 60,
  });
  await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    template: 'passwordReset',
  });
  await persistNotificationLog(user.id, 'passwordReset', user.email, tpl.subject);
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<void> {
  validatePassword(newPassword);
  const user = await prisma.user.findFirst({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw Errors.badRequest('Reset token is invalid or expired');
  }
  const hash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) throw Errors.badRequest('Verification token is invalid');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      status: user.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : user.status,
    },
  });
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user || user.deletedAt || user.emailVerified) return;
  let token = user.emailVerifyToken;
  if (!token) {
    token = generateRandomToken(24);
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: token },
    });
  }
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
  const tpl = verifyEmailTemplate({ firstName: user.firstName, verifyUrl });
  await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    template: 'verifyEmail',
  });
  await persistNotificationLog(user.id, 'verifyEmail', user.email, tpl.subject);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  validatePassword(newPassword);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('User not found');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw Errors.unauthorized('Current password is incorrect');
  const hash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });
}

import { prisma } from '../config/database';
import { Errors } from '../utils/response';
import { uploadFile, deleteFile } from './storage.service';
import { toPublicUser, type PublicUser } from './auth.service';
import type { Language, User } from '@prisma/client';
import { buildWarehouseAddress } from './customerCode.service';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phoneCell?: string | null;
  phoneHome?: string | null;
  language?: Language;
  gender?: string | null;
  dateOfBirth?: string | null; // ISO yyyy-mm-dd
  idType?: string | null;
  idNumber?: string | null;
  preferredBranchId?: string | null;
}

export async function getUserById(id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) throw Errors.notFound('User not found');
  return user;
}

export async function getMe(userId: string): Promise<PublicUser & {
  phoneCell: string | null;
  phoneHome: string | null;
  profilePhotoUrl: string | null;
  idPhotoUrl: string | null;
  idType: string | null;
  idNumber: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  preferredBranchId: string | null;
  createdAt: Date;
}> {
  const u = await getUserById(userId);
  return {
    ...toPublicUser(u),
    phoneCell: u.phoneCell,
    phoneHome: u.phoneHome,
    profilePhotoUrl: u.profilePhotoUrl,
    idPhotoUrl: u.idPhotoUrl,
    idType: u.idType,
    idNumber: u.idNumber,
    gender: u.gender,
    dateOfBirth: u.dateOfBirth,
    preferredBranchId: u.preferredBranchId,
    createdAt: u.createdAt,
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const data: Record<string, unknown> = {};
  if (input.firstName !== undefined) data.firstName = input.firstName.trim();
  if (input.lastName !== undefined) data.lastName = input.lastName.trim();
  if (input.phoneCell !== undefined) data.phoneCell = input.phoneCell;
  if (input.phoneHome !== undefined) data.phoneHome = input.phoneHome;
  if (input.language !== undefined) data.language = input.language;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.dateOfBirth !== undefined) {
    data.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
  }
  if (input.idType !== undefined) data.idType = input.idType;
  if (input.idNumber !== undefined) data.idNumber = input.idNumber;
  if (input.preferredBranchId !== undefined) {
    data.preferredBranchId = input.preferredBranchId;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });

  // If the customer's name changed, regenerate their printed warehouse address
  // strings so the labels stay correct.
  if (input.firstName !== undefined || input.lastName !== undefined) {
    const { airAddress, seaAddress } = buildWarehouseAddress({
      customerCode: updated.customerCode,
      firstName: updated.firstName,
      lastName: updated.lastName,
    });
    await prisma.usWarehouseAddress.update({
      where: { userId },
      data: { airAddress, seaAddress },
    });
  }

  return toPublicUser(updated);
}

export interface UploadedFileInput {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'application/pdf': 'pdf',
};

function extFor(mime: string, fallback = 'bin'): string {
  return EXT_BY_MIME[mime] ?? fallback;
}

export async function setProfilePhoto(
  userId: string,
  file: UploadedFileInput,
): Promise<{ url: string }> {
  const user = await getUserById(userId);
  const key = `profiles/${userId}/profile.${extFor(file.mimetype)}`;
  const result = await uploadFile({
    key,
    buffer: file.buffer,
    contentType: file.mimetype,
    publicRead: true,
  });
  // Best-effort: delete previous file if its URL ended with a different ext.
  if (user.profilePhotoUrl && !user.profilePhotoUrl.endsWith(key)) {
    const oldKey = user.profilePhotoUrl.split('/').slice(-3).join('/');
    if (oldKey.startsWith('profiles/')) await deleteFile(oldKey);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { profilePhotoUrl: result.url },
  });
  return { url: result.url };
}

export async function setIdPhoto(
  userId: string,
  file: UploadedFileInput,
): Promise<{ url: string }> {
  const user = await getUserById(userId);
  const key = `id-docs/${userId}/id.${extFor(file.mimetype)}`;
  const result = await uploadFile({
    key,
    buffer: file.buffer,
    contentType: file.mimetype,
  });
  if (user.idPhotoUrl && !user.idPhotoUrl.endsWith(key)) {
    const oldKey = user.idPhotoUrl.split('/').slice(-3).join('/');
    if (oldKey.startsWith('id-docs/')) await deleteFile(oldKey);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { idPhotoUrl: result.url },
  });
  return { url: result.url };
}

export async function getMyAddresses(userId: string): Promise<{
  customerCode: string;
  airAddress: string;
  seaAddress: string;
  warehouse: { id: string; name: string; address: string; city: string } | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { usWarehouseAddress: { include: { warehouse: true } } },
  });
  if (!user) throw Errors.notFound('User not found');
  if (!user.usWarehouseAddress) {
    // Backfill if missing (older accounts).
    const { airAddress, seaAddress } = buildWarehouseAddress({
      customerCode: user.customerCode,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    await prisma.usWarehouseAddress.create({
      data: {
        userId,
        aptNumber: user.customerCode,
        airAddress,
        seaAddress,
      },
    });
    return {
      customerCode: user.customerCode,
      airAddress,
      seaAddress,
      warehouse: null,
    };
  }
  const w = user.usWarehouseAddress.warehouse;
  return {
    customerCode: user.customerCode,
    airAddress: user.usWarehouseAddress.airAddress,
    seaAddress: user.usWarehouseAddress.seaAddress,
    warehouse: w
      ? { id: w.id, name: w.name, address: w.address, city: w.city }
      : null,
  };
}

export async function exportMyData(userId: string): Promise<Record<string, unknown>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: true,
      usWarehouseAddress: true,
      shipments: { include: { trackingEvents: true } },
      wallet: { include: { transactions: true } },
      notifications: true,
      supportTickets: true,
      thirdPartyAuths: true,
      loyaltyHistory: true,
    },
  });
  if (!user) throw Errors.notFound('User not found');
  // Strip secrets.
  const {
    passwordHash: _p,
    resetToken: _r,
    resetTokenExpiry: _re,
    emailVerifyToken: _ev,
    ...safe
  } = user;
  void _p;
  void _r;
  void _re;
  void _ev;
  return { exportedAt: new Date().toISOString(), user: safe };
}

export async function deleteMyAccount(userId: string): Promise<void> {
  // Soft delete: keep records for audit/finance.
  // Anonymize PII.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('User not found');
  const ts = Date.now();
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      status: 'DELETED',
      email: `deleted+${ts}+${userId}@deleted.local`,
      passwordHash: '',
      phoneCell: null,
      phoneHome: null,
      profilePhotoUrl: null,
      idPhotoUrl: null,
      idNumber: null,
    },
  });
}

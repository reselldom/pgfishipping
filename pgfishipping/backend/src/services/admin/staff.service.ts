import bcrypt from 'bcryptjs';
import { Prisma, UserRole, type Staff } from '@prisma/client';
import { prisma } from '../../config/database';
import { Errors } from '../../utils/response';

export interface StaffInput {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  warehouseId?: string | null;
  isActive?: boolean;
}

export type StaffPublic = Omit<Staff, 'passwordHash'>;

function strip(s: Staff): StaffPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = s;
  return rest;
}

export async function listStaff(): Promise<StaffPublic[]> {
  const rows = await prisma.staff.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(strip);
}

export async function createStaff(input: StaffInput): Promise<StaffPublic> {
  if (input.role === 'CUSTOMER') {
    throw Errors.badRequest('Cannot create staff with CUSTOMER role');
  }
  if (!input.password || input.password.length < 8) {
    throw Errors.badRequest('Password must be at least 8 characters');
  }
  const existing = await prisma.staff.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) throw Errors.conflict('Email already in use');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const created = await prisma.staff.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      warehouseId: input.warehouseId ?? null,
      isActive: input.isActive ?? true,
    },
  });
  return strip(created);
}

export async function updateStaff(
  id: string,
  input: Partial<StaffInput>,
): Promise<StaffPublic> {
  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound('Staff member not found');

  const data: Prisma.StaffUpdateInput = {};
  if (input.name) data.name = input.name;
  if (input.email) data.email = input.email.toLowerCase();
  if (input.role) data.role = input.role;
  if (input.warehouseId !== undefined) {
    data.warehouseId = input.warehouseId;
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 12);
  }

  const updated = await prisma.staff.update({ where: { id }, data });
  return strip(updated);
}

export async function deactivateStaff(id: string): Promise<StaffPublic> {
  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound('Staff member not found');
  const updated = await prisma.staff.update({
    where: { id },
    data: { isActive: false },
  });
  return strip(updated);
}

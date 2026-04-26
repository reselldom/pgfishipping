import type { Request, Response } from 'express';
import { z } from 'zod';
import { Language } from '@prisma/client';
import { ok, Errors } from '../utils/response';
import {
  deleteMyAccount,
  exportMyData,
  getMe,
  getMyAddresses,
  setIdPhoto,
  setProfilePhoto,
  updateProfile,
} from '../services/user.service';

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const data = await getMe(req.auth.userId);
  ok(res, data);
}

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phoneCell: z.string().max(40).nullable().optional(),
  phoneHome: z.string().max(40).nullable().optional(),
  language: z.nativeEnum(Language).optional(),
  gender: z.string().max(20).nullable().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .nullable()
    .optional(),
  idType: z.string().max(40).nullable().optional(),
  idNumber: z.string().max(80).nullable().optional(),
  preferredBranchId: z.string().max(60).nullable().optional(),
});

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const body = req.body as z.infer<typeof updateProfileSchema>;
  const result = await updateProfile(req.auth.userId, body);
  ok(res, result);
}

export async function uploadProfilePhoto(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  if (!req.file) throw Errors.badRequest('No file uploaded');
  const result = await setProfilePhoto(req.auth.userId, req.file);
  ok(res, result);
}

export async function uploadIdPhoto(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  if (!req.file) throw Errors.badRequest('No file uploaded');
  const result = await setIdPhoto(req.auth.userId, req.file);
  ok(res, result);
}

export async function myAddress(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const data = await getMyAddresses(req.auth.userId);
  ok(res, data);
}

export async function exportData(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const data = await exportMyData(req.auth.userId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="pgfishipping-data-${req.auth.customerCode}.json"`,
  );
  res.send(JSON.stringify(data, null, 2));
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  await deleteMyAccount(req.auth.userId);
  ok(res, { message: 'Account deleted' });
}

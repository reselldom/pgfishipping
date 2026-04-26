import type { Request, Response } from 'express';
import { z } from 'zod';
import { Language } from '@prisma/client';
import { ok, created } from '../utils/response';
import {
  changePassword,
  loginUser,
  refreshSession,
  registerCustomer,
  requestPasswordReset,
  resendVerificationEmail,
  resetPasswordWithToken,
  verifyEmail,
} from '../services/auth.service';
import { Errors } from '../utils/response';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phoneCell: z.string().max(40).optional(),
  phoneHome: z.string().max(40).optional(),
  language: z.nativeEnum(Language).optional(),
  referralCode: z.string().max(40).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const forgotSchema = z.object({
  email: z.string().email(),
});

export const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export const verifySchema = z.object({
  token: z.string().min(10),
});

export const resendVerifySchema = z.object({
  email: z.string().email(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof registerSchema>;
  const result = await registerCustomer(body);
  created(res, result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof loginSchema>;
  const result = await loginUser(body);
  ok(res, result);
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // Stateless JWT — client deletes the token. Cookie clear is best-effort.
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  ok(res, { message: 'Logged out' });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof forgotSchema>;
  await requestPasswordReset(body.email);
  ok(res, {
    message: 'If an account exists for this email, a reset link has been sent.',
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof resetSchema>;
  await resetPasswordWithToken(body.token, body.password);
  ok(res, { message: 'Password reset successful' });
}

export async function verify(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof verifySchema>;
  await verifyEmail(body.token);
  ok(res, { message: 'Email verified' });
}

export async function resendVerification(
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body as z.infer<typeof resendVerifySchema>;
  await resendVerificationEmail(body.email);
  ok(res, {
    message: 'If the account exists and is unverified, a new email has been sent.',
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof refreshSchema>;
  const tokens = await refreshSession(body.refreshToken);
  ok(res, { tokens });
}

export async function changePasswordCtl(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth) throw Errors.unauthorized();
  const body = req.body as z.infer<typeof changePasswordSchema>;
  await changePassword(req.auth.userId, body.currentPassword, body.newPassword);
  ok(res, { message: 'Password changed' });
}

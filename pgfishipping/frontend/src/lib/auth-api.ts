import { api, unwrap, type ApiSuccess } from './api';
import type { AuthUser } from './store/auth';

export interface LoginResponse {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string };
}

export async function login(
  identifier: string,
  password: string,
): Promise<LoginResponse> {
  const r = await api.post<ApiSuccess<LoginResponse>>('/auth/login', {
    identifier,
    password,
  });
  return unwrap(r);
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneCell?: string;
  language?: string;
  referralCode?: string;
}

export async function register(payload: RegisterPayload): Promise<LoginResponse> {
  const r = await api.post<ApiSuccess<LoginResponse>>('/auth/register', payload);
  return unwrap(r);
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // ignore — local clear happens regardless
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await api.post('/auth/reset-password', { token, newPassword });
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post('/auth/verify-email', { token });
}

export async function fetchMe(): Promise<AuthUser> {
  const r = await api.get<ApiSuccess<AuthUser>>('/user/me');
  return unwrap(r);
}

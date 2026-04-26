import { api, unwrap } from './api';
import type { AuthUser, ApiSuccess } from './types';

interface LoginResponse {
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

export async function register(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneCell?: string;
  language?: string;
}): Promise<LoginResponse> {
  const r = await api.post<ApiSuccess<LoginResponse>>('/auth/register', payload);
  return unwrap(r);
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function fetchMe(): Promise<AuthUser> {
  const r = await api.get<ApiSuccess<AuthUser>>('/user/me');
  return unwrap(r);
}


import axios, { AxiosError } from 'axios';

import { useAuthStore } from './store/auth';
import type { ApiSuccess } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function unwrap<T>(response: { data: ApiSuccess<T> }): T {
  if (!response.data.ok) throw new Error('Request failed');
  return response.data.data;
}

export function getApiErrorMessage(error: unknown): string {
  const err = error as AxiosError<{ message?: string; error?: string }>;
  return (
    err.response?.data?.message ??
    err.response?.data?.error ??
    err.message ??
    'Something went wrong.'
  );
}


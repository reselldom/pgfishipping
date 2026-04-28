import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { useAuthStore } from './store/auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}
export interface ApiError {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const rt = useAuthStore.getState().refreshToken;
      if (!rt) {
        useAuthStore.getState().clear();
        return null;
      }
      const r = await axios.post<
        ApiSuccess<{ tokens: { accessToken: string; refreshToken: string } }>
      >(`${API_URL}/auth/refresh`, { refreshToken: rt }, { withCredentials: true });
      const data = r.data;
      if (data.ok && data.data.tokens?.accessToken && data.data.tokens.refreshToken) {
        useAuthStore
          .getState()
          .setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
        return data.data.tokens.accessToken;
      }
    } catch {
      useAuthStore.getState().clear();
    } finally {
      refreshing = null;
    }
    return null;
  })();
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    if (data && !data.ok) return data.error.message;
    if (err.code === 'ERR_NETWORK')
      return 'Network error. Check your connection.';
    return err.message;
  }
  return 'Something went wrong.';
}

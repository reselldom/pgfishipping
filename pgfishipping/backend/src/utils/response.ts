import type { Response } from 'express';

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function ok<T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
  status = 200,
): Response<ApiSuccess<T>> {
  return res.status(status).json({ ok: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T): Response<ApiSuccess<T>> {
  return ok(res, data, undefined, 201);
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response<ApiError> {
  return res
    .status(status)
    .json({ ok: false, error: { code, message, ...(details ? { details } : {}) } });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const Errors = {
  badRequest: (message = 'Bad request', details?: unknown) =>
    new HttpError(400, 'BAD_REQUEST', message, details),
  unauthorized: (message = 'Unauthorized') =>
    new HttpError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Forbidden') => new HttpError(403, 'FORBIDDEN', message),
  notFound: (message = 'Not found') => new HttpError(404, 'NOT_FOUND', message),
  conflict: (message = 'Conflict') => new HttpError(409, 'CONFLICT', message),
  unprocessable: (message = 'Unprocessable entity', details?: unknown) =>
    new HttpError(422, 'UNPROCESSABLE_ENTITY', message, details),
  tooMany: (message = 'Too many requests') =>
    new HttpError(429, 'TOO_MANY_REQUESTS', message),
  internal: (message = 'Internal server error') =>
    new HttpError(500, 'INTERNAL_ERROR', message),
};

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginated<T>(
  res: Response,
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): Response<ApiSuccess<T[]>> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return ok<T[]>(res, items, { pagination: { page, pageSize, total, totalPages } });
}

import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { fail, HttpError } from '../utils/response';
import { isProd } from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    fail(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    fail(
      res,
      422,
      'VALIDATION_ERROR',
      'Request validation failed',
      err.flatten(),
    );
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      fail(res, 409, 'CONFLICT', 'A record with that value already exists', {
        target: err.meta?.target,
      });
      return;
    }
    if (err.code === 'P2025') {
      fail(res, 404, 'NOT_FOUND', 'Record not found');
      return;
    }
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    fail(res, status, `UPLOAD_${err.code}`, err.message);
    return;
  }
  // multer fileFilter errors are plain Errors with our custom message.
  if (err instanceof Error && err.message.startsWith('Unsupported file type:')) {
    fail(res, 415, 'UNSUPPORTED_MEDIA_TYPE', err.message);
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  const message =
    err instanceof Error ? err.message : 'Internal server error';

  fail(
    res,
    500,
    'INTERNAL_ERROR',
    isProd ? 'Internal server error' : message,
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, 'NOT_FOUND', `Route not found: ${req.method} ${req.path}`);
}

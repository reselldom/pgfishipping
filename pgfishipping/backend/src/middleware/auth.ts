import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { Errors } from '../utils/response';

export interface JwtClaims {
  sub: string;
  code: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(claims: Omit<JwtClaims, 'iat' | 'exp'>): string {
  return jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signRefreshToken(claims: Omit<JwtClaims, 'iat' | 'exp'>): string {
  return jwt.sign({ ...claims, kind: 'refresh' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtClaims {
  return jwt.verify(token, env.JWT_SECRET) as JwtClaims;
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookieToken = (req as any).cookies?.access_token;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  return null;
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);
  if (!token) {
    next(Errors.unauthorized('Authentication required'));
    return;
  }
  try {
    const claims = verifyToken(token);
    req.auth = {
      userId: claims.sub,
      customerCode: claims.code,
      role: claims.role,
      email: claims.email,
    };
    next();
  } catch {
    next(Errors.unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(Errors.unauthorized('Authentication required'));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(Errors.forbidden('Insufficient permissions'));
      return;
    }
    next();
  };
}

const ADMIN_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'MANAGER',
  'WAREHOUSE_STAFF',
  'COURIER',
  'FINANCE',
  'SUPPORT',
];

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    next(Errors.unauthorized('Authentication required'));
    return;
  }
  if (!ADMIN_ROLES.includes(req.auth.role)) {
    next(Errors.forbidden('Admin access only'));
    return;
  }
  next();
}

import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthPayload {
      userId: string;
      customerCode: string;
      role: UserRole;
      email: string;
    }

    interface Request {
      auth?: AuthPayload;
    }
  }
}

export {};

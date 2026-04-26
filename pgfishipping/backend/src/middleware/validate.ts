import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(options: ValidateOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (options.body) req.body = options.body.parse(req.body);
      if (options.query) {
        const parsed = options.query.parse(req.query);
        Object.assign(req.query, parsed);
      }
      if (options.params) {
        const parsed = options.params.parse(req.params);
        Object.assign(req.params, parsed);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
        return;
      }
      next(err);
    }
  };
}

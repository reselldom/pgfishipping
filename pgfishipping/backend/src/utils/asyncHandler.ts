import type { NextFunction, Request, Response } from 'express';

type AsyncFn<TReq extends Request = Request> = (
  req: TReq,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler<TReq extends Request = Request>(fn: AsyncFn<TReq>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as TReq, res, next)).catch(next);
  };
}

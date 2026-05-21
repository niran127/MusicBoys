import { Request, Response, NextFunction } from 'express';

export const errMsg = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

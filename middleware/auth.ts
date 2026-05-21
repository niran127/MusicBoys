import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }
  next();
};

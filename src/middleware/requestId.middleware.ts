import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include id property
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.id = req.id || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

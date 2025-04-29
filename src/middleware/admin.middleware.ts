import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt.middleware';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // First check if we have a user (JWT middleware should have run)
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Admin IDs from env var or default to ID 1
  const adminUserIds = process.env.ADMIN_USER_IDS
    ? process.env.ADMIN_USER_IDS.split(',').map(id => parseInt(id.trim()))
    : [1];

  if (!adminUserIds.includes(req.user.id)) {
    console.warn(`User ${req.user.id} attempted to access admin endpoint`);
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};

// create a middleware composition that applies verifyToken first, then the admin check
export const adminAuth = [verifyToken, requireAdmin];

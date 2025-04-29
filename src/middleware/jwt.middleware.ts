import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: number;
  username: string;
  email?: string;
  iat: number;
  exp: number;
}

// Extend the Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email?: string;
      };
    }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return; // Add return to exit the function
  }

  try {
    // Verify token with proper type handling
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    // Ensure decoded has expected structure before using as JwtPayload
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'id' in decoded &&
      'username' in decoded
    ) {
      // Attach user info to request
      req.user = {
        id: decoded.id as number,
        username: decoded.username as string,
        email: decoded.email as string | undefined,
      };
      next();
    } else {
      throw new Error('Invalid token structure');
    }
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Optional middleware - will only add JWT user if token exists, but won't fail if no token
export const optionalJwtAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'id' in decoded &&
      'username' in decoded
    ) {
      req.user = {
        id: decoded.id as number,
        username: decoded.username as string,
        email: decoded.email as string | undefined,
      };
    }
  } catch (error) {
    // Token invalid but we don't need to fail the request
    console.warn('Invalid token in optional auth:', error);
  }

  next();
};

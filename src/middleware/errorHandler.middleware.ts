import { Request, Response, NextFunction } from 'express';
import { requestLogger, LogLevel } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Log the error with context
  requestLogger(req, `Unhandled error: ${err.message}`, LogLevel.ERROR, {
    stack: err.stack,
    name: err.name,
  });

  // Don't expose error details in production
  const isProduction = process.env.NODE_ENV === 'production';

  // Send response
  res.status(500).json({
    error: 'Internal server error',
    message: isProduction ? 'An unexpected error occurred' : err.message,
    requestId: req.id, // Include request ID for correlation
  });
};

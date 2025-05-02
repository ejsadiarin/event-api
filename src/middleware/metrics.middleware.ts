import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../utils/metrics';

// Helper to normalize route paths by removing IDs
const normalizeRoute = (path: string): string => {
  // Replace numeric IDs in paths like /api/events/123 with /api/events/:id
  return path.replace(/\/\d+/g, '/:id');
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip metrics endpoint itself to avoid self-referential metrics
  if (req.path === '/metrics') {
    return next();
  }

  // Get normalized route pattern
  const route = normalizeRoute(req.path);
  const method = req.method;

  // Track timing
  const end = httpRequestDuration.startTimer();

  // Track response
  const originalSend = res.send;
  res.send = function (body): Response {
    const statusCode = res.statusCode.toString();

    // Record metrics once response is sent
    httpRequestTotal.inc({ method, route, status_code: statusCode });
    end({ method, route, status_code: statusCode });

    return originalSend.call(this, body);
  };

  next();
};

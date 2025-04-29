import 'express-session';
import { JwtPayload } from '../middleware/jwt.middleware';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
    };
  }
}

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

interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  schedule: Date;
  available_slots: number;
  max_capacity: number;
  org_name: string;
  org_logo: string;
}

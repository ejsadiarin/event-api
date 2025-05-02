import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from '../../../src/routes/auth';
import jwt from 'jsonwebtoken';
import UserModel from '../../../src/models/User';
import { requestLogger, LogLevel } from '../../../src/utils/logger';

// Mock dependencies
vi.mock('../../../src/utils/logger', () => ({
  requestLogger: vi.fn(),
  log: vi.fn(),
  LogLevel: {
    INFO: 'INFO',
    ERROR: 'ERROR',
    WARN: 'WARN',
    DEBUG: 'DEBUG',
  },
}));

vi.mock('../../../src/models/User', () => ({
  default: {
    create: vi.fn(),
    findByUsername: vi.fn(),
    verifyPassword: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mocked-jwt-token'),
    verify: vi.fn(),
  },
}));

vi.mock('../../../src/config/redis', () => ({
  redisClient: {
    keys: vi.fn().mockResolvedValue(['session:1']),
    del: vi.fn().mockResolvedValue(true),
    exists: vi.fn().mockResolvedValue(true),
    expire: vi.fn().mockResolvedValue(true),
    set: vi.fn().mockResolvedValue(true),
  },
  redisTracker: {
    set: vi.fn().mockResolvedValue(true),
  },
}));

describe('Auth Routes', () => {
  // Create Express app with middleware
  const app = express();

  // Add middleware for request ID and session
  app.use((req: any, res, next) => {
    req.id = 'test-request-id';
    req.session = {
      destroy: vi.fn(callback => callback(null)),
      user: null,
    };
    next();
  });

  app.use(express.json());
  app.use('/api/auth', authRouter);

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      vi.mocked(UserModel.create).mockResolvedValueOnce({
        id: 1,
        username: 'newuser',
        password: 'hashedpassword',
        email: 'newuser@example.com',
      });

      const response = await request(app).post('/api/auth/register').send({
        username: 'newuser',
        password: 'password123',
        email: 'newuser@example.com',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 1,
        username: 'newuser',
        email: 'newuser@example.com',
      });
      expect(UserModel.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'password123',
        email: 'newuser@example.com',
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        email: 'test@example.com',
      };

      vi.mocked(UserModel.findByUsername).mockResolvedValueOnce(mockUser);
      vi.mocked(UserModel.verifyPassword).mockResolvedValueOnce(true);

      const response = await request(app).post('/api/auth/login').send({
        username: 'testuser',
        password: 'correctpassword',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Login successful',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        },
        token: 'mocked-jwt-token',
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, username: 'testuser', email: 'test@example.com' },
        expect.any(String),
        { expiresIn: '24h' },
      );
    });
  });
});

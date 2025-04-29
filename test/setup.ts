import dotenv from 'dotenv';
import { vi } from 'vitest';

// load environment variables from .env.test if it exists, otherwise use .env
dotenv.config({ path: '.env.test' });

// mock Redis client
vi.mock('../src/config/redis', () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
    decr: vi.fn(),
    incr: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    connect: vi.fn().mockResolvedValue(undefined),
  },
  initializeEventSlots: vi.fn().mockResolvedValue(undefined),
}));

// mock MySQL pool
vi.mock('../src/config/database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  getPool: vi.fn().mockReturnValue({
    query: vi.fn(),
    getConnection: vi.fn().mockReturnValue({
      query: vi.fn(),
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    }),
  }),
}));

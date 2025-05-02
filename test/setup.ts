import dotenv from 'dotenv';
import { vi } from 'vitest';

// Load environment variables from .env.test if it exists, otherwise use .env
dotenv.config({ path: '.env.test' });

// Mock Redis client
vi.mock('../src/config/redis', () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
    decr: vi.fn(),
    incr: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    connect: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue(['session:1', 'session:2']),
    // Change this line to return a number instead of a boolean
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(true),
    expire: vi.fn().mockResolvedValue(true),
    info: vi.fn().mockResolvedValue('used_memory_human:1.2M'),
  },
  redisTracker: {
    get: vi.fn(),
    set: vi.fn(),
    decr: vi.fn(),
    incr: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
  },
  initializeEventSlots: vi.fn().mockResolvedValue(undefined),
}));

// Mock MySQL pool and executeQuery
vi.mock('../src/config/database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  // This is critical - executeQuery must return an array with the first element
  // being the rows to match MySQL2's structure
  executeQuery: vi.fn().mockImplementation(() => Promise.resolve([[]])),
  getPool: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue([[], []]),
    getConnection: vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue([[], []]),
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    }),
  }),
}));

// Mock logger
vi.mock('../src/utils/logger', () => ({
  requestLogger: vi.fn(),
  log: vi.fn(),
  LogLevel: {
    INFO: 'INFO',
    ERROR: 'ERROR',
    WARN: 'WARN',
    DEBUG: 'DEBUG',
  },
}));

// Mock metrics
vi.mock('../src/utils/metrics', () => ({
  register: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: vi
      .fn()
      .mockResolvedValue(
        '# HELP test_metric Test metric\n# TYPE test_metric gauge\ntest_metric 1\n',
      ),
  },
  httpRequestDuration: {
    startTimer: vi.fn().mockReturnValue(vi.fn()),
  },
  httpRequestTotal: {
    inc: vi.fn(),
  },
  dbQueryDuration: {
    startTimer: vi.fn().mockReturnValue(vi.fn()),
  },
  redisOperationDuration: {
    startTimer: vi.fn().mockReturnValue(vi.fn()),
  },
  eventRegistrationTotal: {
    inc: vi.fn(),
  },
  eventSlotsGauge: {
    set: vi.fn(),
  },
  loginAttemptTotal: {
    inc: vi.fn(),
  },
  activeSessionsGauge: {
    set: vi.fn(),
  },
}));

// Mock UUID
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid'),
}));

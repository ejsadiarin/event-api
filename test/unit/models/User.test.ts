import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserModel from '../../../src/models/User';
import { getPool, executeQuery } from '../../../src/config/database';
import bcrypt from 'bcrypt';
import { ResultSetHeader } from 'mysql2';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../../src/config/database', () => ({
  getPool: vi.fn(),
  executeQuery: vi.fn(),
}));

describe('UserModel', () => {
  const mockPool = {
    query: vi.fn(),
    getConnection: vi.fn().mockReturnValue({
      query: vi.fn(),
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    }),
  };

  beforeEach(() => {
    vi.mocked(getPool).mockReturnValue(mockPool as any);
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const mockUser = {
        username: 'testuser',
        password: 'testpassword',
        email: 'test@example.com',
      };

      // Mock executeQuery to return proper structure
      vi.mocked(executeQuery).mockResolvedValueOnce([
        {
          insertId: 1,
          affectedRows: 1,
          fieldCount: 0,
          info: '',
          serverStatus: 0,
          warningStatus: 0,
        },
      ] as unknown as [ResultSetHeader]);

      const result = await UserModel.create(mockUser);

      expect(bcrypt.hash).toHaveBeenCalledWith('testpassword', 10);
      expect(executeQuery).toHaveBeenCalledWith(
        'INSERT INTO users (username, password, email, display_picture) VALUES (?, ?, ?, ?)',
        ['testuser', 'hashedpassword', 'test@example.com', null],
      );
      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        password: 'testpassword',
        email: 'test@example.com',
      });
    });
  });

  describe('findByUsername', () => {
    it('should find a user by username', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        email: 'test@example.com',
      };

      // Mock executeQuery to return rows properly structured
      vi.mocked(executeQuery).mockResolvedValueOnce([[mockUser]] as unknown as [any[]]);

      const result = await UserModel.findByUsername('testuser');

      expect(executeQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE username = ?', [
        'testuser',
      ]);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      // Return empty array of rows
      vi.mocked(executeQuery).mockResolvedValueOnce([[]] as unknown as [any[]]);

      const result = await UserModel.findByUsername('nonexistentuser');

      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        email: 'test@example.com',
      };

      const result = await UserModel.verifyPassword(mockUser, 'correctpassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', 'hashedpassword');
      expect(result).toBe(true);
    });
  });
});

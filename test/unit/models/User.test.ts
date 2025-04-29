import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserModel from '../../../src/models/User';
import { getPool } from '../../../src/config/database';
import bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

describe('UserModel', () => {
  const mockPool = {
    query: vi.fn(),
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

      mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

      const result = await UserModel.create(mockUser);

      expect(bcrypt.hash).toHaveBeenCalledWith('testpassword', 10);
      expect(mockPool.query).toHaveBeenCalledWith(
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

      mockPool.query.mockResolvedValueOnce([[mockUser]]);

      const result = await UserModel.findByUsername('testuser');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE username = ?', [
        'testuser',
      ]);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockPool.query.mockResolvedValueOnce([[]]);

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

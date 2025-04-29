import { getPool } from '../config/database';
import bcrypt from 'bcrypt';
import { ResultSetHeader } from 'mysql2';

const SALT_ROUNDS = 10;

interface User {
  id?: number;
  username: string;
  password: string;
  email?: string;
  display_picture?: string;
}

interface UserUpdate {
  email?: string;
  display_picture?: string;
}

class UserModel {
  static async create(user: User): Promise<User> {
    const pool = getPool();
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, email, display_picture) VALUES (?, ?, ?, ?)',
      [user.username, hashedPassword, user.email || null, user.display_picture || null],
    );
    return { id: (result as any).insertId, ...user };
  }

  static async findByUsername(username: string): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return (rows as any[])[0] || null;
  }

  static async findById(userId: number): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    return (rows as any[])[0] || null;
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  static async updateProfile(userId: number, data: UserUpdate): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET email = COALESCE(?, email), display_picture = COALESCE(?, display_picture) WHERE id = ?',
      [data.email, data.display_picture, userId],
    );
    return result.affectedRows > 0;
  }

  static async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const pool = getPool();
    try {
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // using a transaction for better error handling
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [result] = await connection.query<ResultSetHeader>(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, userId],
        );

        if (result.affectedRows === 0) {
          await connection.rollback();
          return false;
        }

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        console.error('Error in transaction while changing password:', error);
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  static async deleteAccount(userId: number): Promise<boolean> {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // first delete related registrations (like cascade)
      await connection.query('DELETE FROM registrations WHERE user_id = ?', [userId]);

      // then delete the user
      const [result] = await connection.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [
        userId,
      ]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting account:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default UserModel;
export type { User };

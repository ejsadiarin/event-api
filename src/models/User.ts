import { getPool } from '../config/database';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

interface User {
    id?: number;
    username: string;
    password: string;
    email?: string;
    display_picture?: string;
}

class UserModel {
    static async create(user: User): Promise<User> {
        const pool = getPool();
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
        const [result] = await pool.query(
            'INSERT INTO users (username, password, email, display_picture) VALUES (?, ?, ?, ?)',
            [user.username, hashedPassword, user.email || null, user.display_picture || null]
        );
        return { id: (result as any).insertId, ...user };
    }

    static async findByUsername(username: string): Promise<User | null> {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return (rows as any[])[0] || null;
    }

    static async verifyPassword(user: User, password: string): Promise<boolean> {
        return bcrypt.compare(password, user.password);
    }
}

export default UserModel;
export type { User };

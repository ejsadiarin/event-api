import type { RequestHandler } from 'express';
import UserModel from '../models/User';
import jwt from 'jsonwebtoken';

// Helper function to generate JWT token
const generateToken = (user: { id: number, username: string, email?: string }) => {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '24h' }
    );
};

export const register: RequestHandler = async (req, res) => {
    try {
        const user = await UserModel.create(req.body);

        res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: 'Registration failed' });
    }
};

export const login: RequestHandler = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await UserModel.findByUsername(username);

        if (!user || !(await UserModel.verifyPassword(user, password))) {
            res.status(401).json({ error: 'Invalid credentials' });
        }

        // only generate JWT token on login
        const token = generateToken({
            id: user?.id!,
            username: user?.username!,
            email: user?.email
        });

        // also store user info in session for backward compatibility
        if (req.session) {
            req.session.user = {
                id: user?.id as number,
                username: user?.username as string
            };
        }

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user?.id as number,
                username: user?.username as string,
                email: user?.email!
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

export const logout: RequestHandler = (req, res) => {
    // session-based auth
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ error: 'Logout failed' });
            }
            res.clearCookie('connect.sid');

            res.json({
                message: 'Logged out successfully',
                note: 'For JWT auth, please discard your token on the client side'
            });
        });
    } else {
        res.json({
            message: 'Logged out successfully',
            note: 'For JWT auth, please discard your token on the client side'
        });
    }
};

export const getProfile: RequestHandler = (req, res) => {
    // check for JWT auth first (from middleware)
    if (req.user) {
        res.status(200).json(req.user);
    }

    // fall back to session auth
    if (!req.session || !req.session.user) {
        res.status(401).json({ error: 'Not authenticated' });
    }

    res.status(200).json(req.session.user);
};

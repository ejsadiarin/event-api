import type { RequestHandler } from 'express';
import UserModel from '../models/User';
import jwt from 'jsonwebtoken';

export const register: RequestHandler = async (req, res) => {
    try {
        const user = await UserModel.create(req.body);
        res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
        res.status(400).json({ error: 'Registration failed' });
    }
};

export const login: RequestHandler = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await UserModel.findByUsername(username);

        if (!user || !(await UserModel.verifyPassword(user, password))) {
            res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user?.id, username: user?.username },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};

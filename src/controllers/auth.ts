import type { RequestHandler } from 'express';
import UserModel from '../models/User';
import jwt from 'jsonwebtoken';

interface ProfileUpdateRequest {
  email?: string;
  display_picture?: string;
}

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

interface AccountDeleteRequest {
  password: string;
}

// Helper function to generate JWT token
const generateToken = (user: { id: number; username: string; email?: string }) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '24h' },
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
      return;
    }

    const user = await UserModel.findByUsername(username);

    if (!user || !(await UserModel.verifyPassword(user, password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // only generate JWT token on login
    const token = generateToken({
      id: user?.id!,
      username: user?.username!,
      email: user?.email,
    });

    // also store user info in session for backward compatibility
    if (req.session) {
      req.session.user = {
        id: user?.id as number,
        username: user?.username as string,
      };
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user?.id as number,
        username: user?.username as string,
        email: user?.email!,
      },
      token,
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
        note: 'For JWT auth, please discard your token on the client side',
      });
    });
  } else {
    res.json({
      message: 'Logged out successfully',
      note: 'For JWT auth, please discard your token on the client side',
    });
  }
};

export const getProfile: RequestHandler = (req, res) => {
  // check for JWT auth first (from middleware)
  if (req.user) {
    res.status(200).json(req.user);
    return;
  }

  // fall back to session auth
  if (!req.session || !req.session.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.status(200).json(req.session.user);
};

export const updateProfile: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const { email, display_picture } = req.body as ProfileUpdateRequest;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const success = await UserModel.updateProfile(userId, {
      email: email || undefined,
      display_picture: display_picture || undefined,
    });

    if (!success) {
      res.status(404).json({ error: 'User not found or no changes made' });
      return;
    }

    // Fetch updated user data
    const updatedUser = await UserModel.findById(userId);
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        display_picture: updatedUser.display_picture,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    res.status(500).json({ error: message });
  }
};

export const changePassword: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body as PasswordChangeRequest;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passwordValid = await UserModel.verifyPassword(user, currentPassword);
    if (!passwordValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // change password
    try {
      const success = await UserModel.changePassword(userId, newPassword);
      if (!success) {
        res.status(500).json({ error: 'Failed to update password - user not found' });
        return;
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Database error during password change:', error);
      res.status(500).json({ error: 'Database error during password change' });
    }
  } catch (error) {
    console.error('Error changing password:', error);
    const message = error instanceof Error ? error.message : 'Failed to change password';
    res.status(500).json({ error: message });
  }
};

export const deleteAccount: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const { password } = req.body as AccountDeleteRequest;

    // Require password confirmation for account deletion
    if (!password) {
      res.status(400).json({ error: 'Password confirmation required' });
      return;
    }

    // Verify password
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passwordValid = await UserModel.verifyPassword(user, password);
    if (!passwordValid) {
      res.status(401).json({ error: 'Password is incorrect' });
      return;
    }

    // Delete account
    const success = await UserModel.deleteAccount(userId);
    if (!success) {
      res.status(500).json({ error: 'Failed to delete account' });
      return;
    }

    // Clear session if exists
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);

    // Handle foreign key constraint error
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('foreign key constraint')) {
      res.status(400).json({
        error: 'Cannot delete account because it has associated registrations or other data',
        message: 'Please contact support to delete your account and associated data',
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to delete account';
    res.status(500).json({ error: message });
  }
};

import type { RequestHandler } from 'express';
import UserModel from '../models/User';
import jwt from 'jsonwebtoken';
import { loginAttemptTotal, activeSessionsGauge } from '../utils/metrics';
import { redisClient, redisTracker } from '../config/redis';
import { requestLogger, LogLevel } from '../utils/logger';

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
      // Record failed login attempt
      loginAttemptTotal.inc({ status: 'failure' });
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

      // Store the session in Redis with a TTL
      await redisTracker.set(`user:session:${user?.id}`, Date.now().toString());
      // Set expiry time to match session lifetime (24 hours)
      await redisClient.expire(`user:session:${user?.id}`, 24 * 60 * 60);

      // Update active sessions count
      await updateSessionCount();
    }

    // Record successful login
    loginAttemptTotal.inc({ status: 'success' });

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
    console.error(`[${req.id}] Login error:`, error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout: RequestHandler = (req, res) => {
  // Get user ID before destroying session
  const userId = req.user?.id || req.session?.user?.id;

  // session-based auth
  if (req.session) {
    req.session.destroy(async err => {
      if (err) {
        requestLogger(req, 'Session destruction failed during logout', LogLevel.ERROR, {
          error: err,
        });
        return res.status(500).json({ error: 'Logout failed' });
      }

      // Remove session tracking if we have a user ID
      if (userId) {
        try {
          await redisClient.del(`user:session:${userId}`);
          // Update session count
          await updateSessionCount();
          requestLogger(req, `User ${userId} logged out`, LogLevel.INFO);
        } catch (redisError) {
          requestLogger(req, 'Redis error during logout', LogLevel.ERROR, { error: redisError });
        }
      }

      res.clearCookie('connect.sid');
      res.json({
        message: 'Logged out successfully',
        note: 'For JWT auth, please discard your token on the client side',
      });
    });
  } else {
    res.clearCookie('connect.sid');
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

// Implement a more robust session counting function
async function updateSessionCount() {
  try {
    const sessionKeys = await redisClient.keys('user:session:*');

    // Update the Prometheus gauge
    activeSessionsGauge.set(sessionKeys.length);

    // Log the current session count
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Active session count updated',
        service: 'event-api',
        activeSessions: sessionKeys.length,
      }),
    );

    return sessionKeys.length;
  } catch (error) {
    console.error('Error updating session count:', error);
    return 0;
  }
}

// Replace the countActiveSessions function with more detailed implementation
async function countActiveSessions(): Promise<number> {
  try {
    // Count user sessions
    const userSessions = await redisClient.keys('user:session:*');

    // Count Redis session store entries if using Redis session store
    const redisSessionStoreKeys = await redisClient.keys('session:*');

    // Log detailed counts for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'DEBUG',
          message: 'Session counting details',
          service: 'event-api',
          userSessionCount: userSessions.length,
          redisSessionCount: redisSessionStoreKeys.length,
        }),
      );
    }

    // Return user sessions count as the source of truth
    return userSessions.length;
  } catch (error) {
    console.error('Error counting active sessions:', error);
    return 0;
  }
}

// Add a function to periodically check and clean up expired sessions
// This should be called when the server starts
export function startSessionMonitoring() {
  const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

  setInterval(async () => {
    try {
      // Get all user sessions
      const sessionKeys = await redisClient.keys('user:session:*');
      let expiredCount = 0;

      // Check each session for validity
      for (const key of sessionKeys) {
        const userId = key.split(':')[2];
        // Check if there's a corresponding session in the session store
        const sessionExists = await redisClient.exists(`session:${userId}`);

        if (!sessionExists) {
          // If no corresponding session, delete the user session key
          await redisClient.del(key);
          expiredCount++;
        }
      }

      // Update the session count after cleanup
      await updateSessionCount();

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Session cleanup completed',
          service: 'event-api',
          expiredSessionsRemoved: expiredCount,
          remainingSessions: await countActiveSessions(),
        }),
      );
    } catch (error) {
      console.error('Error during session cleanup:', error);
    }
  }, CLEANUP_INTERVAL);

  // Initial count
  updateSessionCount();
}

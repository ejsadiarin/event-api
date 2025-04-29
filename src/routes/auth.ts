import { Router } from 'express';
import {
  login,
  register,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/auth';
import { verifyToken } from '../middleware/jwt.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// JWT-protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/password', verifyToken, changePassword);
router.delete('/account', verifyToken, deleteAccount);

export default router;

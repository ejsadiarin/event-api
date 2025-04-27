import { Router } from 'express';
import { login, register, logout, getProfile } from '../controllers/auth';
// import { requireAuth } from '../middleware/auth.middleware';
import { verifyToken } from '../middleware/jwt.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// JWT-specific endpoints
router.get('/profile', verifyToken, getProfile);

export default router;

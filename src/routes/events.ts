import { Router } from 'express';
import { getEvents, registerForEvent, createEvent, getUserRegistrations, getEventSlots, checkEventRegistration } from '../controllers/events';
import { verifyToken } from '../middleware/jwt.middleware';

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/slots', getEventSlots);
router.get('/:id/slots', getEventSlots);

// Protected routes - require JWT authentication
router.post('/', verifyToken, createEvent);
router.post('/:id/register', verifyToken, registerForEvent);
router.get('/user/registrations', verifyToken, getUserRegistrations);

router.get('/:id/check-registration', verifyToken, checkEventRegistration);

export default router;

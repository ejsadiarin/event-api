import { Router } from 'express';
import { getEvents, registerForEvent, createEvent } from '../controllers/events';

const router = Router();

// GET /api/events
router.get('/', getEvents);

// POST /api/events
router.post('/', createEvent);

// POST /api/events/:id/register
router.post('/:id/register', registerForEvent);

export default router;

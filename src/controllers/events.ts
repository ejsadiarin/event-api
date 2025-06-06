import type { RequestHandler } from 'express';
import { getPool, executeQuery } from '../config/database';
import { redisClient, redisTracker } from '../config/redis';
import { eventRegistrationTotal } from '../utils/metrics';
import { requestLogger, LogLevel } from '../utils/logger';

export const getEvents: RequestHandler = async (req, res) => {
  try {
    requestLogger(req, 'Fetching all events');
    const pool = getPool();
    const [events] = await executeQuery<any[]>(`
            SELECT e.*, o.name AS org_name, o.org_logo 
            FROM events e
            JOIN organizations o ON e.org_id = o.id
        `);

    const eventsWithSlots = await Promise.all(
      (events as any[]).map(async event => {
        // use redisTracker (wrapper for redis metrics)
        const slots = await redisTracker.get(`event:${event.id}:slots`);
        return {
          ...event,
          available_slots: parseInt(slots || event.max_capacity.toString()),
        };
      }),
    );

    requestLogger(req, `Returned ${eventsWithSlots.length} events`);
    res.json(eventsWithSlots);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const registerForEvent: RequestHandler = async (req, res) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  const eventId = parseInt(req.params.id as string);

  // get user ID from JWT token (added by middleware)
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user?.id!;

  try {
    requestLogger(req, `User ${userId} attempting to register for event ${eventId}`, LogLevel.INFO);
    await connection.beginTransaction();

    // existence checks for user, events
    const [existingRegistrations] = await connection.query(
      'SELECT id FROM registrations WHERE user_id = ? AND event_id = ?',
      [userId, eventId],
    );

    if ((existingRegistrations as any[]).length > 0) {
      await connection.rollback();
      res.status(400).json({ error: 'User already registered for this event' });
    }

    const [eventRows] = await connection.query('SELECT id FROM events WHERE id = ?', [eventId]);

    if ((eventRows as any[]).length === 0) {
      await connection.rollback();
      res.status(404).json({ error: 'Event not found' });
    }

    // if good, then decrement slots on event in redis
    const availableSlots = await redisTracker.decr(`event:${eventId}:slots`);

    if (availableSlots < 0) {
      await redisTracker.incr(`event:${eventId}:slots`);
      await connection.rollback();
      res.status(400).json({ error: 'No slots available' });
    }

    // then write to registrations table
    await connection.query(
      `INSERT INTO registrations (user_id, event_id) 
             VALUES (?, ?)`,
      [userId, eventId],
    );

    // update registered_count
    await connection.query(
      `UPDATE events 
             SET registered_count = registered_count + 1 
             WHERE id = ?`,
      [eventId],
    );

    await connection.commit();

    // increment registration counter metric
    eventRegistrationTotal.inc({ event_id: eventId.toString() });

    requestLogger(
      req,
      `User ${userId} registered for event ${eventId} successfully`,
      LogLevel.INFO,
      {
        availableSlots,
        eventId,
      },
    );
    res.json({ availableSlots });
  } catch (error) {
    await connection.rollback();
    await redisTracker.incr(`event:${eventId}:slots`);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    requestLogger(req, `Registration failed for event ${eventId}`, LogLevel.ERROR, {
      userId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(500).json({ error: message });
  } finally {
    connection.release();
  }
};

export const createEvent: RequestHandler = async (req, res) => {
  try {
    const pool = getPool();
    const { title, description, org_id, venue, schedule, is_free, code, max_capacity } = req.body;

    if (!title || !org_id || !venue || !schedule || !max_capacity) {
      res.status(400).json({ error: 'Missing required fields' });
    }

    const mysqlDatetime = new Date(schedule).toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await executeQuery<any[]>(
      `INSERT INTO events 
            (title, description, org_id, venue, schedule, is_free, code, max_capacity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, org_id, venue, mysqlDatetime, is_free, code, max_capacity],
    );

    const eventId = (result as any).insertId;

    // then init slots of this event in Redis
    await redisTracker.set(`event:${eventId}:slots`, max_capacity.toString());

    res.status(201).json({
      id: eventId,
      message: 'Event created successfully',
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getUserRegistrations: RequestHandler = async (req, res) => {
  try {
    // Get user ID from JWT token (added by middleware)
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user?.id;
    const pool = getPool();

    // Get user's registered events with event details
    const [registrations] = await executeQuery<any[]>(
      `
            SELECT 
                e.id, e.title, e.description, e.venue, e.schedule, 
                e.is_free, e.code, o.name AS org_name, o.org_logo,
                r.created_at AS registration_date
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            JOIN organizations o ON e.org_id = o.id
            WHERE r.user_id = ?
            ORDER BY e.schedule ASC
        `,
      [userId],
    );

    res.json(registrations);
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({ error: 'Failed to fetch user registrations' });
  }
};

export const getEventSlots: RequestHandler = async (req, res) => {
  try {
    const eventId = req.params.id ? parseInt(req.params.id) : null;

    if (eventId) {
      // get slots for a specific event (if eventId is provided)
      const pool = getPool();

      // check first if event exists in db
      const [eventRows] = await executeQuery<any[]>('SELECT id FROM events WHERE id = ?', [
        eventId,
      ]);
      if ((eventRows as any[]).length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      const slots = await redisTracker.get(`event:${eventId}:slots`);
      res.json({ eventId, slots: parseInt(slots || '0') });
    } else {
      // get slots for all events (by default)
      const pool = getPool();
      const [events] = await executeQuery<any[]>('SELECT id FROM events');

      const slotsData = await Promise.all(
        (events as any[]).map(async event => {
          const slots = await redisTracker.get(`event:${event.id}:slots`);
          return {
            eventId: event.id,
            slots: parseInt(slots || '0'),
          };
        }),
      );

      res.json(slotsData);
    }
  } catch (error) {
    console.error(`[${req.id}] Error fetching Redis slots:`, error);
    res.status(500).json({ error: 'Failed to fetch slot information' });
  }
};

export const checkEventRegistration: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user?.id;
    const eventId = parseInt(req.params.id);

    if (isNaN(eventId)) {
      res.status(400).json({ error: 'Invalid event ID' });
    }

    const pool = getPool();
    const [result] = await executeQuery<any[]>(
      'SELECT id FROM registrations WHERE user_id = ? AND event_id = ?',
      [userId, eventId],
    );

    const isRegistered = (result as any[]).length > 0;

    res.json({ isRegistered });
  } catch (error) {
    console.error('Error checking event registration:', error);
    res.status(500).json({ error: 'Failed to check registration status' });
  }
};

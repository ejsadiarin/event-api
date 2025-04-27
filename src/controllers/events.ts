import type { RequestHandler } from 'express';
import { getPool } from '../config/database';
import { redisClient } from '../config/redis';

export const getEvents: RequestHandler = async (_, res) => {
    try {
        const pool = getPool();
        const [events] = await pool.query(`
            SELECT e.*, o.name AS org_name, o.org_logo 
            FROM events e
            JOIN organizations o ON e.org_id = o.id
        `);

        const eventsWithSlots = await Promise.all(
            (events as any[]).map(async (event) => {
                const slots = await redisClient.get(`event:${event.id}:slots`);
                return {
                    ...event,
                    available_slots: parseInt(slots || event.max_capacity)
                };
            })
        );

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

    try {
        const userId = 1; // Replace with actual user ID from auth
        await connection.beginTransaction();

        const availableSlots = await redisClient.decr(`event:${eventId}:slots`);

        if (availableSlots < 0) {
            await redisClient.incr(`event:${eventId}:slots`);
            res.status(400).json({ error: 'No slots available' });
            return;
        }

        await connection.query(
            `INSERT INTO registrations (user_id, event_id) 
             VALUES (?, ?)`,
            [userId, eventId]
        );

        await connection.query(
            `UPDATE events 
             SET registered_count = registered_count + 1 
             WHERE id = ?`,
            [eventId]
        );

        await connection.commit();
        res.json({ availableSlots });

    } catch (error) {
        await connection.rollback();
        await redisClient.incr(`event:${eventId}:slots`);

        console.error('Registration error:', error);
        const message = error instanceof Error ? error.message : 'Registration failed';
        res.status(500).json({ error: message });
    } finally {
        connection.release();
    }
};


export const createEvent: RequestHandler = async (req, res) => {
    try {
        const pool = getPool();
        const {
            title,
            description,
            org_id,
            venue,
            schedule,
            is_free,
            code,
            max_capacity
        } = req.body;

        // Validate required fields
        if (!title || !org_id || !venue || !schedule || !max_capacity) {
            res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert new event
        const [result] = await pool.query(
            `INSERT INTO events 
       (title, description, org_id, venue, schedule, is_free, code, max_capacity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, org_id, venue, schedule, is_free, code, max_capacity]
        );

        const eventId = (result as any).insertId;

        // Initialize slots in Redis
        await redisClient.set(`event:${eventId}:slots`, max_capacity.toString());

        res.status(201).json({
            id: eventId,
            message: 'Event created successfully'
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
};

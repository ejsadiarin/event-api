import { getPool } from '../config/database';

interface Event {
    id: number;
    org_id: number;
    title: string;
    description: string;
    venue: string;
    schedule: Date;
    is_free: boolean;
    code?: string;
    registered_count: number;
    max_capacity: number;
}

class EventModel {
    static async findAll(): Promise<Event[]> {
        const pool = getPool();
        const [rows] = await pool.query(`
      SELECT e.*, o.name AS org_name, o.org_logo 
      FROM events e
      JOIN organizations o ON e.org_id = o.id
    `);
        return rows as Event[];
    }

    static async incrementRegistration(eventId: number): Promise<void> {
        const pool = getPool();
        await pool.query(
            'UPDATE events SET registered_count = registered_count + 1 WHERE id = ?',
            [eventId]
        );
    }
}

export default EventModel;

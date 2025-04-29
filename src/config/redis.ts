import { createClient } from 'redis';
import { getPool } from './database';

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on('error', err => console.error('Redis error:', err));

const initializeEventSlots = async () => {
  await redisClient.connect();
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, max_capacity FROM events');

  for (const event of rows as any[]) {
    await redisClient.set(`event:${event.id}:slots`, event.max_capacity.toString());
  }
};

export { redisClient, initializeEventSlots };

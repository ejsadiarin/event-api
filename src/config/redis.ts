import { createClient } from 'redis';
import { getPool } from './database';

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on('error', err => console.error('Redis error:', err));

// const initializeEventSlots = async () => {
//   await redisClient.connect();
//   const pool = getPool();
//   const [rows] = await pool.query('SELECT id, max_capacity FROM events');
//
//   for (const event of rows as any[]) {
//     await redisClient.set(`event:${event.id}:slots`, event.max_capacity.toString());
//   }
// };

const initializeEventSlots = async () => {
  await redisClient.connect();
  const pool = getPool();

  // Check if Redis has data for events
  const testKey = await redisClient.get('event:test');
  const needsInit = testKey === null;

  if (needsInit) {
    console.log('Initializing Redis slots from database...');
    const [rows] = await pool.query('SELECT id, max_capacity, registered_count FROM events');

    for (const event of rows as any[]) {
      const availableSlots = event.max_capacity - event.registered_count;
      await redisClient.set(`event:${event.id}:slots`, availableSlots.toString());
    }

    // marker to indicate Redis has been initialized
    await redisClient.set('event:test', '1');
  } else {
    console.log('Redis slots data already exists, skipping initialization');
  }
};

export { redisClient, initializeEventSlots };

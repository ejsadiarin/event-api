import { createClient } from 'redis';
import { getPool } from './database';
import { redisOperationDuration, eventSlotsGauge } from '../utils/metrics';

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on('error', err => console.error('Redis error:', err));

// Wrap Redis operations with metrics
export const redisTracker = {
  // GET operation
  get: async (key: string): Promise<string | null> => {
    const timer = redisOperationDuration.startTimer();
    try {
      const result = await redisClient.get(key);

      // Update gauge if this is a slots key
      const eventIdMatch = key.match(/^event:(\d+):slots$/);
      if (eventIdMatch && result !== null) {
        const eventId = eventIdMatch[1];
        const slots = parseInt(result);
        eventSlotsGauge.set({ event_id: eventId }, slots);
      }

      return result;
    } finally {
      timer({ operation: 'get' });
    }
  },

  // SET operation
  set: async (key: string, value: string): Promise<void> => {
    const timer = redisOperationDuration.startTimer();
    try {
      await redisClient.set(key, value);

      // Update gauge if this is a slots key
      const eventIdMatch = key.match(/^event:(\d+):slots$/);
      if (eventIdMatch) {
        const eventId = eventIdMatch[1];
        const slots = parseInt(value);
        eventSlotsGauge.set({ event_id: eventId }, slots);
      }
    } finally {
      timer({ operation: 'set' });
    }
  },

  // DECR operation with slots tracking
  decr: async (key: string): Promise<number> => {
    const timer = redisOperationDuration.startTimer();
    try {
      const result = await redisClient.decr(key);

      // Update gauge if this is a slots key
      const eventIdMatch = key.match(/^event:(\d+):slots$/);
      if (eventIdMatch) {
        const eventId = eventIdMatch[1];
        eventSlotsGauge.set({ event_id: eventId }, result);
      }

      return result;
    } finally {
      timer({ operation: 'decr' });
    }
  },

  // INCR operation with slots tracking
  incr: async (key: string): Promise<number> => {
    const timer = redisOperationDuration.startTimer();
    try {
      const result = await redisClient.incr(key);

      // Update gauge if this is a slots key
      const eventIdMatch = key.match(/^event:(\d+):slots$/);
      if (eventIdMatch) {
        const eventId = eventIdMatch[1];
        eventSlotsGauge.set({ event_id: eventId }, result);
      }

      return result;
    } finally {
      timer({ operation: 'incr' });
    }
  },

  // Add additional Redis operations as needed
  ping: async (): Promise<string> => {
    const timer = redisOperationDuration.startTimer();
    try {
      return await redisClient.ping();
    } finally {
      timer({ operation: 'ping' });
    }
  },
};

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

      // Use the raw client here since we're initializing
      await redisClient.set(`event:${event.id}:slots`, availableSlots.toString());

      // Set the gauge for each event
      eventSlotsGauge.set({ event_id: event.id.toString() }, availableSlots);
    }

    // marker to indicate Redis has been initialized
    await redisClient.set('event:test', '1');
  } else {
    console.log('Redis slots data already exists, skipping initialization');

    // Still update gauges for existing events
    const [rows] = await pool.query('SELECT id FROM events');
    for (const event of rows as any[]) {
      const slots = await redisClient.get(`event:${event.id}:slots`);
      if (slots !== null) {
        eventSlotsGauge.set({ event_id: event.id.toString() }, parseInt(slots));
      }
    }
  }
};

export { redisClient, initializeEventSlots };

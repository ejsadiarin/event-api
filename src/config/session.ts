import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { activeSessionsGauge } from '../utils/metrics';

export const configureSession = async (app: any) => {
  const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });

  await redisClient.connect();

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'session:',
  });

  // Set up periodic session counting
  setInterval(async () => {
    try {
      const sessionKeys = await redisClient.keys('session:*');
      activeSessionsGauge.set(sessionKeys.length);
    } catch (error) {
      console.error('Error counting sessions:', error);
    }
  }, 60 * 1000);

  // session middleware
  app.use(
    session({
      store: redisStore,
      secret: process.env.SESSION_SECRET || 'your_session_secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );

  return redisClient;
};

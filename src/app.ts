import express from 'express';
import cors from 'cors';
import { initDB } from './config/database';
import { initializeEventSlots } from './config/redis';
import eventsRouter from './routes/events';
import authRouter from './routes/auth';
import organizationsRouter from './routes/organizations';
import healthcheckRouter from './routes/health';
import monitoringRouter from './routes/monitoring';
import metricsRouter from './routes/metrics';
import { metricsMiddleware } from './middleware/metrics.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { configureSession } from './config/session';
import { startSyncJob } from './jobs/syncRedisToDb';
import { errorHandler } from './middleware/errorHandler.middleware';
import { startSessionMonitoring } from './controllers/auth';

const startServer = async () => {
  const app = express();

  // initialize database first
  await initDB();
  console.log('Database initialized');

  // then initialize Redis
  await initializeEventSlots();
  console.log('Redis initialized');

  // configure session
  await configureSession(app);
  console.log('Session configured');

  // middleware and routes
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/organizations', organizationsRouter);
  app.use('/api/health', healthcheckRouter);
  app.use('/api/monitoring', monitoringRouter);
  app.use('/metrics', metricsRouter);

  app.use(errorHandler);

  startSessionMonitoring();
  console.log('Session monitoring started');
  startSyncJob();
  console.log('Background jobs started');

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

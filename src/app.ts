import express from 'express';
import cors from 'cors';
import { initDB } from './config/database'; // Updated import
import { initializeEventSlots } from './config/redis';
import eventsRouter from './routes/events';
import authRouter from './routes/auth';
import organizationsRouter from './routes/organizations';
import { configureSession } from './config/session';


const startServer = async () => {
    const app = express();

    // Initialize database first
    await initDB();
    console.log('Database initialized');

    // Then initialize Redis
    await initializeEventSlots();
    console.log('Redis initialized');

    // Configure session
    await configureSession(app);
    console.log('Session configured');

    // Middleware and routes
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    }));
    app.use(express.json());

    app.use('/api/auth', authRouter);
    app.use('/api/events', eventsRouter);
    app.use('/api/organizations', organizationsRouter);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

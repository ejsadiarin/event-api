import { Router } from 'express';
import { getPool } from '../config/database';
import { redisClient } from '../config/redis';

const router = Router()

router.get('/ready', async (_, res) => {
    try {
        // check DB connection
        const pool = getPool();
        await pool.query('SELECT 1');
        // check Redis connection
        await redisClient.ping();
        res.status(200).send('Ready');
    } catch (error) {
        res.status(500).send('Not ready');
    }
});

router.get('/live', (_, res) => {
    // simple check if app is running
    res.status(200).send('Alive');
});

export default router;

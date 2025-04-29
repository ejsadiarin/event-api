import { Router, Request, Response } from 'express';
import { getSyncMetrics, fullReconciliation } from '../jobs/syncRedisToDb';
import { redisClient } from '../config/redis';
import { getPool } from '../config/database';
import { adminAuth } from '../middleware/admin.middleware';
import { RowDataPacket } from 'mysql2/promise';

// Define the interface extending RowDataPacket for MySQL compatibility
interface VersionRow extends RowDataPacket {
  version: string;
}

const router = Router();

// Get sync job metrics
router.get('/sync-status', (_: Request, res: Response) => {
  try {
    const metrics = getSyncMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting sync metrics:', error);
    res.status(500).json({ error: 'Failed to get sync metrics' });
  }
});

// System health overview
router.get('/system', adminAuth, async (_: Request, res: Response) => {
  try {
    // Check Redis - safer implementation
    let redisStatus = { connected: false, memory: 'unknown' };
    try {
      // Type guard to check isReady property
      const isReady =
        typeof (redisClient as any).isReady === 'boolean' ? (redisClient as any).isReady : true; // Fallback if property doesn't exist

      if (isReady) {
        redisStatus.connected = true;
        try {
          // Note: redis-client may implement info differently based on version
          const info = await redisClient.info();
          const memMatch = info.match(/used_memory_human:(.*)/);
          if (memMatch && memMatch[1]) {
            redisStatus.memory = memMatch[1].trim();
          }
        } catch (redisInfoError) {
          console.warn('Unable to get Redis info:', redisInfoError);
        }
      }
    } catch (redisError) {
      console.warn('Redis status check failed:', redisError);
    }

    // Check Database - safer implementation
    let dbStatus = { connected: false, version: 'unknown' };
    try {
      const pool = getPool();
      // Fix MySQL query typing
      const [rows] = await pool.query('SELECT VERSION() as version');
      const typedRows = rows as VersionRow[];

      if (Array.isArray(typedRows) && typedRows.length > 0) {
        dbStatus = {
          connected: true,
          version: typedRows[0]?.version || 'unknown',
        };
      }
    } catch (dbError) {
      console.warn('Database status check failed:', dbError);
    }

    // Application info
    const appInfo = {
      uptime: Math.floor(process.uptime()),
      memoryUsage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      },
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
    };

    res.json({
      status: 'ok',
      timestamp: new Date(),
      redis: redisStatus,
      database: dbStatus,
      application: appInfo,
      syncMetrics: getSyncMetrics(),
    });
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Trigger a full reconciliation (admin only)
router.post('/reconcile', adminAuth, async (_: Request, res: Response) => {
  try {
    await fullReconciliation();
    res.json({ success: true, message: 'Full reconciliation completed' });
  } catch (error) {
    console.error('Reconciliation failed:', error);
    res.status(500).json({ error: 'Failed to reconcile' });
  }
});

export default router;

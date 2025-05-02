import { Router } from 'express';
import { register } from '../utils/metrics';

const router = Router();

// Metrics endpoint
router.get('/', async (_, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Error serving metrics:', error);
    res.status(500).send('Error collecting metrics');
  }
});

export default router;

import { describe, it, expect, vi, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import metricsRouter from '../../../src/routes/metrics';
import { register } from '../../../src/utils/metrics';

// Create a proper mock for the metrics register
vi.mock('../../../src/utils/metrics', () => ({
  register: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: vi
      .fn()
      .mockResolvedValue(
        '# HELP test_metric Test metric\n# TYPE test_metric gauge\ntest_metric 1\n',
      ),
  },
}));

// Suppress error logging during tests
const originalConsoleError = console.error;
console.error = vi.fn();

describe('Metrics Routes', () => {
  const app = express();
  app.use('/metrics', metricsRouter);

  // Restore console after tests
  afterAll(() => {
    console.error = originalConsoleError;
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain; version=0.0.4; charset=utf-8');
      expect(response.text).toContain('# HELP test_metric Test metric');
      expect(response.text).toContain('test_metric 1');
      expect(register.metrics).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Make the metrics function throw an error for this test only
      vi.mocked(register.metrics).mockRejectedValueOnce(new Error('Test error'));

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error collecting metrics');
      // Verify the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
});

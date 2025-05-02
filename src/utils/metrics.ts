import promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Add default Node.js metrics
promClient.collectDefaultMetrics({ register });

// API-specific metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // in seconds
  registers: [register],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Database metrics
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Redis operations
const redisOperationDuration = new promClient.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register],
});

// Event registration metrics
const eventRegistrationTotal = new promClient.Counter({
  name: 'event_registrations_total',
  help: 'Total number of event registrations',
  labelNames: ['event_id'],
  registers: [register],
});

// Available slots metrics
const eventSlotsGauge = new promClient.Gauge({
  name: 'event_available_slots',
  help: 'Number of available slots for each event',
  labelNames: ['event_id'],
  registers: [register],
});

// Auth metrics
const loginAttemptTotal = new promClient.Counter({
  name: 'login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status'], // 'success', 'failure'
  registers: [register],
});

// Metric for active user sessions
const activeSessionsGauge = new promClient.Gauge({
  name: 'active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
});

export {
  register,
  httpRequestDuration,
  httpRequestTotal,
  dbQueryDuration,
  redisOperationDuration,
  eventRegistrationTotal,
  eventSlotsGauge,
  loginAttemptTotal,
  activeSessionsGauge,
};

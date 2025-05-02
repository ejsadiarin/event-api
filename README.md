# Event Registration API

This API provides endpoints for managing events and user registrations. It uses MySQL for data storage and Redis for managing event slot availability.

### Usage:

- For development: `docker compose up -d --build`

#### Flow (for testing locally when developing)

- register user
- login user
- create org (event needs this)
- create event
- register to an event
- check all events
- check slots of all event
- check slots of a specific event
- check if current user is registered to a specific event

### Events

#### 1. Get All Events

Retrieves a list of all events with their organization details and available slots.

**Request**

```
GET /api/events
```

**Response**
Status: 200 OK

```json
[
  {
    "id": 1,
    "title": "Web Development Workshop",
    "description": "Learn modern web development techniques",
    "org_id": 1,
    "venue": "Tech Hub Conference Center",
    "schedule": "2023-12-15T14:00:00.000Z",
    "is_free": true,
    "code": "WDW2023",
    "registered_count": 45,
    "max_capacity": 100,
    "org_name": "TechEd Solutions",
    "org_logo": "teched_logo.png",
    "available_slots": 55
  }
]
```

#### 2. Register for an Event

Registers a user for a specific event, decreasing the available slots count.

**Request**

```
POST /api/events/:id/register
Authorization: Bearer {token}
```

**Response (Success)**
Status: 200 OK

```json
{
  "availableSlots": 54
}
```

#### 3. Create a New Event

Creates a new event in the system with the provided details.

**Request**

```
POST /api/events
Authorization: Bearer {token}
```

**Response (Success)**
Status: 201 Created

```json
{
  "id": 3,
  "message": "Event created successfully"
}
```

#### 4. Get User Registrations

Returns all events that the authenticated user has registered for.

**Request**

```
GET /api/events/user/registrations
Authorization: Bearer {token}
```

**Response**
Status: 200 OK

```json
[
  {
    "id": 1,
    "title": "Web Development Workshop",
    "description": "Learn modern web development techniques",
    "venue": "Tech Hub Conference Center",
    "schedule": "2023-12-15T14:00:00.000Z",
    "is_free": true,
    "code": "WDW2023",
    "org_name": "TechEd Solutions",
    "org_logo": "teched_logo.png",
    "registration_date": "2023-11-01T10:30:00.000Z"
  }
]
```

#### 5. Get Event Slots

Returns the available slots for all events or a specific event.

**Request (all events)**

```
GET /api/events/slots
```

**Request (specific event)**

```
GET /api/events/slots/:id
```

**Response**
Status: 200 OK

```json
[
  {
    "eventId": 1,
    "slots": 55
  },
  {
    "eventId": 2,
    "slots": 30
  }
]
```

#### 6. Check Event Registration Status

Checks if the authenticated user is registered for a specific event.

**Request**

```
GET /api/events/:id/check-registration
Authorization: Bearer {token}
```

**Response**
Status: 200 OK

```json
{
  "isRegistered": true
}
```

### Organizations

#### 1. Get All Organizations

Retrieves a list of all organizations.

**Request**

```
GET /api/organizations
```

**Response**
Status: 200 OK

```json
[
  {
    "id": 1,
    "name": "TechEd Solutions",
    "org_logo": "teched_logo.png",
    "top_web_url": "https://techedsolutions.com",
    "background_pub_url": "https://techedsolutions.com/bg.jpg",
    "created_at": "2023-10-01T09:00:00.000Z"
  }
]
```

#### 2. Get Organization by ID

Retrieves details for a specific organization.

**Request**

```
GET /api/organizations/:id
```

**Response**
Status: 200 OK

```json
{
  "id": 1,
  "name": "TechEd Solutions",
  "org_logo": "teched_logo.png",
  "top_web_url": "https://techedsolutions.com",
  "background_pub_url": "https://techedsolutions.com/bg.jpg",
  "created_at": "2023-10-01T09:00:00.000Z"
}
```

#### 3. Create Organization

Creates a new organization.

**Request**

```
POST /api/organizations
```

**Response**
Status: 201 Created

```json
{
  "id": 3,
  "message": "Organization created successfully"
}
```

#### 4. Update Organization

Updates an existing organization.

**Request**

```
PUT /api/organizations/:id
```

**Response**
Status: 200 OK

```json
{
  "message": "Organization updated successfully"
}
```

#### 5. Delete Organization

Deletes an organization if it doesn't have any associated events.

**Request**

```
DELETE /api/organizations/:id
```

**Response**
Status: 200 OK

```json
{
  "message": "Organization deleted successfully"
}
```

### Authentication

#### 1. Register User

Creates a new user account and returns a JWT token for immediate login.

**Request**

```
POST /api/auth/register
```

**Response**
Status: 201 Created

```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Login

Authenticates a user and returns a JWT token.

**Request**

```
POST /api/auth/login
```

**Response**
Status: 200 OK

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Get User Profile

Returns the authenticated user's profile.

**Request**

```
GET /api/auth/profile
Authorization: Bearer {token}
```

**Response**
Status: 200 OK

```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

#### 4. Logout

Logs out the current user (for session-based auth). For JWT, the token should be discarded client-side.

**Request**

```
POST /api/auth/logout
```

**Response**
Status: 200 OK

```json
{
  "message": "Logged out successfully",
  "note": "For JWT auth, please discard your token on the client side"
}
```

## Authentication

The API supports JWT (JSON Web Token) based authentication. To access protected endpoints, include an Authorization header with a Bearer token:

```
Authorization: Bearer your_jwt_token
```

Protected routes include:

- Creating events
- Registering for events
- Getting user registrations
- Getting user profile

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: When the client sends an invalid request
- `401 Unauthorized`: When authentication is required but not provided
- `403 Forbidden`: When the token is invalid or expired
- `404 Not Found`: When the requested resource doesn't exist
- `500 Internal Server Error`: When a server-side error occurs during processing

## Implementation Details

- Event registration uses a transaction to ensure data consistency
- Redis is used for real-time tracking of available slots for each event
- The system automatically updates the `registered_count` in the database and decrements available slots in Redis
- JWT is used for authentication with tokens that expire after 24 hours

---

# BACKEND: Adding Prometheus Metrics to Your Node.js Event API

Based on your codebase and Kubernetes setup with kube-prometheus-stack, I'll help you add custom metrics to your event-api service that will work with your ServiceMonitor configuration.

### Implementation Plan

1. Add the Prometheus client library
2. Create a metrics registry
3. Define custom metrics specific to your API
4. Expose a metrics endpoint
5. Update your ServiceMonitor configuration

### Step 1: Install Dependencies

```bash
npm install prom-client
```

### Step 2: Create a Metrics Module

Create a new file at `src/utils/metrics.ts`:

```typescript
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
```

### Step 3: Add a Metrics Endpoint

Create a new route in `src/routes/metrics.ts`:

```typescript
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
```

### Step 4: Register the Metrics Route

Update your `src/app.ts` to include the metrics route:

```typescript
import express from 'express';
import cors from 'cors';
import { initDB } from './config/database';
import { initializeEventSlots } from './config/redis';
import eventsRouter from './routes/events';
import authRouter from './routes/auth';
import organizationsRouter from './routes/organizations';
import healthcheckRouter from './routes/health';
import monitoringRouter from './routes/monitoring';
import metricsRouter from './routes/metrics'; // Add this line
import { configureSession } from './config/session';
import { startSyncJob } from './jobs/syncRedisToDb';

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
  app.use('/metrics', metricsRouter); // Add this line - keep it at root level for Prometheus

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
```

### Step 5: Create Middleware to Track HTTP Requests

Create a file `src/middleware/metrics.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../utils/metrics';

// Helper to normalize route paths by removing IDs
const normalizeRoute = (path: string): string => {
  // Replace numeric IDs in paths like /api/events/123 with /api/events/:id
  return path.replace(/\/\d+/g, '/:id');
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip metrics endpoint itself to avoid self-referential metrics
  if (req.path === '/metrics') {
    return next();
  }

  // Get normalized route pattern
  const route = normalizeRoute(req.path);
  const method = req.method;

  // Track timing
  const end = httpRequestDuration.startTimer();

  // Track response
  const originalSend = res.send;
  res.send = function (body): Response {
    const statusCode = res.statusCode.toString();

    // Record metrics once response is sent
    httpRequestTotal.inc({ method, route, status_code: statusCode });
    end({ method, route, status_code: statusCode });

    return originalSend.call(this, body);
  };

  next();
};
```

### Step 6: Apply the Metrics Middleware

Update `src/app.ts` to use the metrics middleware:

```typescript
import { metricsMiddleware } from './middleware/metrics.middleware';

// ... existing imports ...

const startServer = async () => {
  const app = express();

  // ... existing initialization ...

  // Add metrics middleware before other middleware
  app.use(metricsMiddleware);

  // ... existing middleware ...

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }),
  );
  app.use(express.json());

  // ... existing routes ...
};
```

### Step 7: Track Database Queries

Update `src/config/database.ts` to track database operations:

```typescript
import { dbQueryDuration } from '../utils/metrics';

// Inside your query wrapper or in a strategic place
const executeQuery = async (sql: string, params: any[]) => {
  const table = extractTableFromQuery(sql); // Helper function to extract table name
  const operation = extractOperationType(sql); // Helper function to extract operation type

  const timer = dbQueryDuration.startTimer();
  try {
    const result = await pool.query(sql, params);
    return result;
  } finally {
    timer({ operation, table });
  }
};

// Helper functions to extract metadata from SQL queries
const extractTableFromQuery = (sql: string): string => {
  // Simple regex to extract table name - enhance as needed
  const match =
    sql.match(/FROM\s+(\w+)/i) || sql.match(/INTO\s+(\w+)/i) || sql.match(/UPDATE\s+(\w+)/i);
  return match ? match[1] : 'unknown';
};

const extractOperationType = (sql: string): string => {
  if (sql.match(/^SELECT/i)) return 'select';
  if (sql.match(/^INSERT/i)) return 'insert';
  if (sql.match(/^UPDATE/i)) return 'update';
  if (sql.match(/^DELETE/i)) return 'delete';
  return 'other';
};
```

### Step 8: Track Redis Operations

Update `src/config/redis.ts` to track Redis operations:

```typescript
import { redisOperationDuration, eventSlotsGauge } from '../utils/metrics';

// Add tracking to Redis get/set operations
const trackRedisOperation = async (operation: string, fn: () => Promise<any>) => {
  const timer = redisOperationDuration.startTimer();
  try {
    return await fn();
  } finally {
    timer({ operation });
  }
};

// Example of tracking slot updates (add this where you update slots)
const updateEventSlots = async (eventId: number, slots: number) => {
  await trackRedisOperation('set', () =>
    redisClient.set(`event:${eventId}:slots`, slots.toString()),
  );

  // Update the gauge for this event
  eventSlotsGauge.set({ event_id: eventId.toString() }, slots);
};

// When getting slots, update the gauge
const getEventSlots = async (eventId: number) => {
  const slots = await trackRedisOperation('get', () => redisClient.get(`event:${eventId}:slots`));

  const slotsValue = parseInt(slots || '0');
  eventSlotsGauge.set({ event_id: eventId.toString() }, slotsValue);
  return slotsValue;
};
```

### Step 9: Track Event Registration

Update `src/controllers/events.ts` to track event registrations:

```typescript
import { eventRegistrationTotal } from '../utils/metrics';

// Inside your registerForEvent function
export const registerForEvent: RequestHandler = async (req, res) => {
  // ... existing code ...

  try {
    // ... existing transaction code ...

    // Record successful registration
    eventRegistrationTotal.inc({ event_id: eventId.toString() });

    // ... existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
};
```

### Step 10: Track Authentication

Update `src/controllers/auth.ts` to track login attempts:

```typescript
import { loginAttemptTotal, activeSessionsGauge } from '../utils/metrics';

export const login: RequestHandler = async (req, res) => {
  try {
    // ... existing code ...

    if (!user || !(await UserModel.verifyPassword(user, password))) {
      loginAttemptTotal.inc({ status: 'failure' });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // ... token generation ...

    // Record successful login
    loginAttemptTotal.inc({ status: 'success' });

    // ... existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
};

// Track session count - you might need to add periodic checks for active sessions
const updateActiveSessionCount = async () => {
  // Example: Count sessions from Redis
  const sessionCount = await countActiveSessions();
  activeSessionsGauge.set(sessionCount);
};
```

### Step 11: Update Your ServiceMonitor Configuration

Ensure your ServiceMonitor is configured correctly - here's an updated version:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: event-api-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: event-api
  endpoints:
    - port: '3000'
      path: /metrics
      interval: 15s
      scrapeTimeout: 10s
```

### Step 12: Create a Grafana Dashboard

Here are some useful Prometheus queries for your Grafana dashboard:

1. **Request Rate by Endpoint**:

   ```
   sum(rate(http_requests_total[5m])) by (route)
   ```

2. **Request Duration (95th Percentile)**:

   ```
   histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (route, le))
   ```

3. **Error Rate by Endpoint**:

   ```
   sum(rate(http_requests_total{status_code=~"5.*"}[5m])) by (route) / sum(rate(http_requests_total[5m])) by (route)
   ```

4. **Database Query Duration**:

   ```
   histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (operation, table, le))
   ```

5. **Event Slots Available**:

   ```
   event_available_slots
   ```

6. **Login Success vs. Failure Rate**:

   ```
   sum(rate(login_attempts_total[5m])) by (status)
   ```

7. **Active Sessions**:
   ```
   active_sessions
   ```

### Loki Integration for Enhanced Observability

To correlate your metrics with logs, add request IDs to your logs and configure Grafana to show logs with Loki:

1. Add a request ID middleware:

```typescript
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.id = req.id || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};
```

2. Update your logging to include the request ID:

```typescript
console.log(`[${req.id}] Request received: ${req.method} ${req.path}`);
```

3. Use Loki in Grafana to query logs with this format and correlate them with your metrics.

This implementation gives you comprehensive monitoring of your event-api service, covering HTTP requests, database operations, Redis interactions, event registrations, and authentication. These metrics will help you identify performance bottlenecks and track application behavior in production.

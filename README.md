# Event Registration API

This API provides endpoints for managing events and user registrations. It uses MySQL for data storage and Redis for managing event slot availability.

### Usage:

- For production: `docker compose up`
- For development: `docker compose --profile dev up`

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
```

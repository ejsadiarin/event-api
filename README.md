# Event Registration API

This API provides endpoints for managing events and user registrations. It uses MySQL for data storage and Redis for managing event slot availability.

### Usage:

- For production: `docker compose up`
- For development: `docker compose --profile dev up`

## API Endpoints

### 1. Get All Events

Retrieves a list of all events with their organization details and available slots.

#### Request

```
GET /api/events
```

#### Response

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
  },
  {
    "id": 2,
    "title": "Data Science Summit",
    "description": "Exploring the latest in data science",
    "org_id": 2,
    "venue": "Innovation Center",
    "schedule": "2023-12-20T09:00:00.000Z",
    "is_free": false,
    "code": "DSS2023",
    "registered_count": 120,
    "max_capacity": 150,
    "org_name": "Data Analytics Group",
    "org_logo": "dag_logo.png",
    "available_slots": 30
  }
]
```

### 2. Register for an Event

Registers a user for a specific event, decreasing the available slots count.

#### Request

```
POST /api/events/:id/register
```

Parameters:
- `id` (path parameter): The ID of the event to register for

Example: `POST /api/events/1/register`

#### Response (Success)

Status: 200 OK

```json
{
  "availableSlots": 54
}
```

#### Response (No Available Slots)

Status: 400 Bad Request

```json
{
  "error": "No slots available"
}
```

#### Response (Server Error)

Status: 500 Internal Server Error

```json
{
  "error": "Registration failed"
}
```

---

### 3. Create a New Event

Creates a new event in the system with the provided details.

#### Request

```
POST /api/events
```

Body:
```json
{
  "title": "AI Conference 2023",
  "description": "A conference on the latest AI developments",
  "org_id": 1,
  "venue": "Tech Convention Center",
  "schedule": "2023-12-30T10:00:00.000Z",
  "is_free": false,
  "code": "AI2023",
  "max_capacity": 200
}
```

Required fields:
- `title`: String (max 50 characters)
- `org_id`: Integer (must be a valid organization ID)
- `venue`: String (max 125 characters)
- `schedule`: Date (ISO 8601 format)
- `max_capacity`: Integer (must be > 0)

Optional fields:
- `description`: Text
- `is_free`: Boolean (defaults to true)
- `code`: String (max 10 characters, must be unique)

#### Response (Success)

Status: 201 Created

```json
{
  "id": 3,
  "message": "Event created successfully"
}
```

#### Response (Validation Error)

Status: 400 Bad Request

```json
{
  "error": "Missing required fields"
}
```

#### Response (Server Error)

Status: 500 Internal Server Error

```json
{
  "error": "Failed to create event"
}
```


## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: When the client sends an invalid request, such as trying to register for an event with no available slots
- `500 Internal Server Error`: When a server-side error occurs during processing

## Implementation Details

- Event registration uses a transaction to ensure data consistency
- Redis is used for real-time tracking of available slots for each event
- The system automatically updates the `registered_count` in the database and decrements available slots in Redis

## Authentication

Currently, authentication is not implemented. The API uses a hardcoded user ID (1) for registration. In a production environment, you would need to implement proper authentication and extract the user ID from the authenticated request.

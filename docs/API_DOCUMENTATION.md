# API Documentation

## Overview

The University Bus Tracking System API provides RESTful endpoints for managing buses, routes, users, and real-time location data. The API uses JWT authentication and supports WebSocket connections for real-time updates.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.com`

## Authentication

All API endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Endpoints

### Authentication

#### POST /auth/login
Authenticate a user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "role": "admin|driver|student",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

#### POST /auth/logout
Logout user and invalidate token.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "admin",
    "first_name": "John",
    "last_name": "Doe",
    "profile_photo_url": "https://..."
  }
}
```

### Bus Management

#### GET /buses
Get all buses with optional filtering.

**Query Parameters:**
- `active` (boolean): Filter by active status
- `route_id` (string): Filter by route
- `driver_id` (string): Filter by assigned driver

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bus-id",
      "code": "BUS001",
      "number_plate": "ABC123",
      "capacity": 50,
      "model": "Mercedes-Benz",
      "year": 2020,
      "is_active": true,
      "bus_image_url": "https://...",
      "driver": {
        "id": "driver-id",
        "first_name": "John",
        "last_name": "Doe",
        "email": "driver@example.com"
      },
      "route": {
        "id": "route-id",
        "name": "Campus Route 1"
      }
    }
  ]
}
```

#### GET /buses/:id
Get specific bus by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bus-id",
    "code": "BUS001",
    "number_plate": "ABC123",
    "capacity": 50,
    "model": "Mercedes-Benz",
    "year": 2020,
    "is_active": true,
    "bus_image_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### POST /buses
Create a new bus.

**Request Body:**
```json
{
  "code": "BUS001",
  "number_plate": "ABC123",
  "capacity": 50,
  "model": "Mercedes-Benz",
  "year": 2020,
  "assigned_driver_id": "driver-id",
  "route_id": "route-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-bus-id",
    "code": "BUS001",
    "number_plate": "ABC123",
    "capacity": 50,
    "model": "Mercedes-Benz",
    "year": 2020,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /buses/:id
Update an existing bus.

**Request Body:**
```json
{
  "code": "BUS001-UPDATED",
  "capacity": 60,
  "is_active": false
}
```

#### DELETE /buses/:id
Delete a bus.

**Response:**
```json
{
  "success": true,
  "message": "Bus deleted successfully"
}
```

### Route Management

#### GET /routes
Get all routes.

**Query Parameters:**
- `active` (boolean): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "route-id",
      "name": "Campus Route 1",
      "description": "Main campus route",
      "stops": {
        "type": "LineString",
        "coordinates": [[lng1, lat1], [lng2, lat2]]
      },
      "distance_km": 5.2,
      "estimated_duration_minutes": 15,
      "is_active": true
    }
  ]
}
```

#### GET /routes/:id
Get specific route by ID.

#### POST /routes
Create a new route.

**Request Body:**
```json
{
  "name": "New Route",
  "description": "Route description",
  "coordinates": [[lng1, lat1], [lng2, lat2]],
  "distance_km": 5.2,
  "estimated_duration_minutes": 15
}
```

#### PUT /routes/:id
Update an existing route.

#### DELETE /routes/:id
Delete a route.

### Location Management

#### POST /location/update
Update bus location (for drivers).

**Request Body:**
```json
{
  "bus_id": "bus-id",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### GET /location/bus/:id
Get current location of a specific bus.

**Response:**
```json
{
  "success": true,
  "data": {
    "bus_id": "bus-id",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2024-01-01T12:00:00Z",
    "route_id": "route-id",
    "eta_minutes": 5
  }
}
```

#### GET /location/route/:id
Get all bus locations for a specific route.

### User Management

#### GET /users
Get all users (admin only).

**Query Parameters:**
- `role` (string): Filter by user role
- `active` (boolean): Filter by active status

#### POST /users
Create a new user (admin only).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "driver",
  "phone": "+1234567890"
}
```

#### PUT /users/:id
Update user information.

#### DELETE /users/:id
Delete a user (admin only).

### File Management

#### POST /storage/upload
Upload a file to storage.

**Request:**
- Content-Type: `multipart/form-data`
- Body: File data

**Query Parameters:**
- `type` (string): "image" or "document"
- `folder` (string): Storage folder

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://storage-url/file.jpg",
    "fileName": "file.jpg",
    "filePath": "folder/file.jpg"
  }
}
```

#### GET /storage/files
List files in storage.

**Query Parameters:**
- `folder` (string): Folder to list
- `type` (string): File type filter

#### DELETE /storage/files/:path
Delete a file from storage.

### Analytics

#### GET /analytics/overview
Get system overview statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBuses": 10,
    "activeBuses": 8,
    "totalRoutes": 5,
    "activeRoutes": 4,
    "totalDrivers": 12,
    "activeDrivers": 10,
    "averageDelay": 2.5
  }
}
```

#### GET /analytics/bus-usage
Get bus usage statistics.

**Query Parameters:**
- `start_date` (string): Start date (YYYY-MM-DD)
- `end_date` (string): End date (YYYY-MM-DD)

### Health Check

#### GET /health
Basic health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z",
    "uptime": 3600
  }
}
```

#### GET /health/detailed
Detailed health check with database status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z",
    "uptime": 3600,
    "database": {
      "healthy": true,
      "responseTime": 15
    },
    "memory": {
      "used": 512,
      "total": 1024
    }
  }
}
```

## WebSocket Events

### Connection
Connect to WebSocket at `ws://localhost:3001` (or `wss://` for production).

### Authentication
Send authentication event:
```json
{
  "type": "auth",
  "token": "jwt-token-here"
}
```

### Events

#### location_update
Real-time bus location updates.

**Data:**
```json
{
  "bus_id": "bus-id",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2024-01-01T12:00:00Z",
  "route_id": "route-id",
  "eta_minutes": 5
}
```

#### bus_status_change
Bus status changes.

**Data:**
```json
{
  "bus_id": "bus-id",
  "status": "active|inactive|maintenance",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### route_update
Route information updates.

**Data:**
```json
{
  "route_id": "route-id",
  "name": "Updated Route Name",
  "stops": {
    "type": "LineString",
    "coordinates": [[lng1, lat1], [lng2, lat2]]
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Server error |

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Window**: 15 minutes
- **Limit**: 100 requests per window
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Response Headers:**
- `X-Total-Count`: Total number of items
- `X-Page-Count`: Total number of pages

## File Upload Limits

- **Images**: 5MB max, formats: JPEG, PNG, WebP
- **Documents**: 10MB max, formats: PDF, JPEG, PNG

## Development

### Testing the API

Use tools like Postman, curl, or any HTTP client:

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get buses (with token)
curl -X GET http://localhost:3001/buses \
  -H "Authorization: Bearer <token>"
```

### WebSocket Testing

Use tools like wscat or browser WebSocket API:

```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
};
ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

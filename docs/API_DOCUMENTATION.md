# API Documentation

## Overview

The University Bus Tracking System API provides RESTful endpoints for managing buses, routes, users, and real-time location data. The API uses JWT authentication and supports WebSocket connections for real-time updates.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://bus-tracking-backend-sxh8.onrender.com`

## WebSocket URL

- **Development**: `ws://localhost:3000`
- **Production**: `wss://bus-tracking-backend-sxh8.onrender.com`

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

## REST API Endpoints

### Authentication

#### POST /auth/login
Authenticate a user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_secure_password"
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

### Health Check

#### GET /health
Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": 3600,
    "version": "1.0.0"
  }
}
```

### Buses

#### GET /api/buses
Get all buses.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bus-id",
      "code": "BUS001",
      "name": "Bus 1",
      "number_plate": "GJ-01-AB-1234",
      "capacity": 50,
      "model": "Tata Starbus",
      "year": 2023,
      "is_active": true,
      "assigned_driver_id": "driver-id",
      "route_id": "route-id"
    }
  ]
}
```

#### GET /api/buses/:busId
Get specific bus information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bus-id",
    "code": "BUS001",
    "name": "Bus 1",
    "number_plate": "GJ-01-AB-1234",
    "capacity": 50,
    "model": "Tata Starbus",
    "year": 2023,
    "is_active": true,
    "assigned_driver_id": "driver-id",
    "route_id": "route-id"
  }
}
```

### Routes

#### GET /api/routes
Get all routes.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "route-id",
      "name": "Route 1",
      "description": "Main campus route",
      "distance_km": 15.5,
      "estimated_duration_minutes": 45,
      "is_active": true,
      "origin": "Main Campus",
      "destination": "City Center"
    }
  ]
}
```

#### GET /api/routes/:routeId
Get specific route information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "route-id",
    "name": "Route 1",
    "description": "Main campus route",
    "distance_km": 15.5,
    "estimated_duration_minutes": 45,
    "is_active": true,
    "origin": "Main Campus",
    "destination": "City Center",
    "stops": {
      "type": "LineString",
      "coordinates": [[72.8777, 19.0760], [72.8778, 19.0761]]
    }
  }
}
```

### Location Updates

#### POST /api/location/update
Update bus location (for drivers).

**Request Body:**
```json
{
  "bus_id": "bus-id",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "speed_kmh": 35,
  "heading_degrees": 180
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "location-id",
    "bus_id": "bus-id",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.0760]
    },
    "speed_kmh": 35,
    "heading_degrees": 180,
    "recorded_at": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/location/bus/:busId
Get current location of a specific bus.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "location-id",
    "bus_id": "bus-id",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.0760]
    },
    "speed_kmh": 35,
    "heading_degrees": 180,
    "recorded_at": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/location/all
Get current locations of all active buses.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "location-id",
      "bus_id": "bus-id",
      "location": {
        "type": "Point",
        "coordinates": [72.8777, 19.0760]
      },
      "speed_kmh": 35,
      "heading_degrees": 180,
      "recorded_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## WebSocket API

### Connection

Connect to the WebSocket server:

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://bus-tracking-backend-sxh8.onrender.com', {
  transports: ['websocket'],
  query: {
    clientType: 'driver', // or 'student'
    version: '1.0.0'
  }
});
```

### Authentication Events

#### Driver Authentication

**Emit:**
```javascript
socket.emit('driver:authenticate', {
  token: 'jwt-token-here'
});
```

**Listen:**
```javascript
// Success
socket.on('driver:authenticated', (data) => {
  console.log('Driver authenticated:', data);
  // data contains: { driverId, busId, busInfo }
});

// Failure
socket.on('driver:authentication_failed', (error) => {
  console.error('Authentication failed:', error);
});
```

#### Student Connection

**Emit:**
```javascript
socket.emit('student:connect');
```

**Listen:**
```javascript
socket.on('student:connected', (data) => {
  console.log('Student connected:', data);
});
```

### Real-time Events

#### Bus Location Updates

**Listen for location updates:**
```javascript
socket.on('bus:locationUpdate', (locationData) => {
  console.log('Bus location update:', locationData);
  // locationData contains: { busId, latitude, longitude, speed, heading, timestamp }
});
```

#### Bus Arriving Notifications

**Listen for bus arriving:**
```javascript
socket.on('bus:arriving', (data) => {
  console.log('Bus arriving:', data);
  // data contains: { busId, routeId, location, timestamp }
});
```

### Driver Events

#### Send Location Update

**Emit location update:**
```javascript
socket.emit('driver:locationUpdate', {
  driverId: 'driver-id',
  latitude: 19.0760,
  longitude: 72.8777,
  timestamp: new Date().toISOString(),
  speed: 35,
  heading: 180
});
```

**Listen for confirmation:**
```javascript
socket.on('driver:locationConfirmed', (data) => {
  console.log('Location update confirmed:', data);
  // data contains: { timestamp, locationId }
});
```

### Connection Management

#### Connection Status

```javascript
// Check connection status
console.log('Connected:', socket.connected);

// Listen for connection events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

#### Heartbeat

```javascript
// Send ping
socket.emit('ping');

// Listen for pong
socket.on('pong', () => {
  console.log('Received pong from server');
});
```

## Error Handling

### HTTP Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### WebSocket Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

## Rate Limiting

- **API Requests**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **WebSocket Connections**: 5 connections per minute per IP

## CORS Configuration

The API supports the following origins:
- `https://bts-frontend-navy.vercel.app`
- `https://*.onrender.com`
- `https://*.vercel.app`
- `http://localhost:5173` (development)

## Environment Variables

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |
| `SUPABASE_URL` | Supabase project URL | `https://gthwmwfwvhyriygpcdlr.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Support

For API issues:
1. Check the response status codes
2. Verify authentication tokens
3. Check environment variables
4. Review WebSocket connection status

For additional help:
- [Project GitHub Issues](https://github.com/tirthraval27/bus-tracking-system/issues)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Supabase Documentation](https://supabase.com/docs)

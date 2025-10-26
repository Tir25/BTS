# University Bus Tracking System - Complete API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs](#base-urls)
4. [Common Response Format](#common-response-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [API Endpoints](#api-endpoints)
8. [WebSocket Events](#websocket-events)
9. [Examples](#examples)
10. [SDK Usage](#sdk-usage)

## Overview

The University Bus Tracking System API provides comprehensive endpoints for managing buses, routes, drivers, and real-time location tracking. The API follows RESTful principles and uses JSON for data exchange.

### Key Features
- Real-time bus location tracking
- Driver assignment management
- Route management
- Student and admin authentication
- WebSocket support for live updates
- Comprehensive error handling
- Rate limiting and security

## Authentication

The API uses JWT-based authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### Student Login
```http
POST /auth/student/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@university.edu",
      "role": "student",
      "first_name": "John",
      "last_name": "Doe"
    },
    "token": "jwt-token"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Driver Login
```http
POST /auth/driver/login
Content-Type: application/json

{
  "email": "driver@university.edu",
  "password": "password123"
}
```

#### Admin Login
```http
POST /auth/admin/login
Content-Type: application/json

{
  "email": "admin@university.edu",
  "password": "password123"
}
```

## Base URLs

- **Development:** `http://localhost:3001`
- **Production:** `https://api.bustracking.university.edu`
- **WebSocket:** `ws://localhost:3001` (dev) / `wss://api.bustracking.university.edu` (prod)

## Common Response Format

All API responses follow this structure:

```json
{
  "success": boolean,
  "data": object | array | null,
  "error": string | null,
  "message": string | null,
  "timestamp": "ISO 8601 string"
}
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error code",
  "message": "Human-readable error message",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Rate Limiting

- **General API:** 100 requests per minute per IP
- **Authentication:** 10 requests per minute per IP
- **WebSocket:** 1000 messages per minute per connection

## API Endpoints

### Health Check

#### Get System Health
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "uptime": 3600,
    "environment": "production",
    "services": {
      "database": {
        "status": "connected",
        "details": {
          "currentTime": "2024-01-01T00:00:00Z",
          "postgresVersion": "15.0",
          "poolSize": 10,
          "idleCount": 5,
          "waitingCount": 0
        }
      },
      "api": {
        "status": "running",
        "database": "connected"
      }
    }
  }
}
```

### Bus Management

#### Get All Buses
```http
GET /buses
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "BUS001",
      "number_plate": "GJ-01-AB-1234",
      "capacity": 50,
      "model": "Tata Starbus",
      "year": 2023,
      "is_active": true,
      "assigned_driver_id": "uuid",
      "route_id": "uuid",
      "driver_full_name": "John Driver",
      "driver_email": "driver@university.edu",
      "route_name": "Route 1",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Get Bus by ID
```http
GET /buses/{id}
Authorization: Bearer <token>
```

#### Create Bus
```http
POST /buses
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "BUS002",
  "number_plate": "GJ-01-CD-5678",
  "capacity": 60,
  "model": "Ashok Leyland",
  "year": 2024,
  "is_active": true
}
```

#### Update Bus
```http
PUT /buses/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "capacity": 65,
  "is_active": true
}
```

#### Delete Bus
```http
DELETE /buses/{id}
Authorization: Bearer <token>
```

### Route Management

#### Get All Routes
```http
GET /routes
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Route 1",
      "description": "Main campus to downtown",
      "distance_km": 15.5,
      "estimated_duration_minutes": 45,
      "is_active": true,
      "city": "Ahmedabad",
      "origin": "University Campus",
      "destination": "Downtown",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Create Route
```http
POST /routes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Route 2",
  "description": "Campus to airport",
  "distance_km": 25.0,
  "estimated_duration_minutes": 60,
  "city": "Ahmedabad",
  "origin": "University Campus",
  "destination": "Airport"
}
```

### Driver Assignment Management

#### Get All Assignments
```http
GET /assignments
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "driver_id": "uuid",
      "bus_id": "uuid",
      "route_id": "uuid",
      "is_active": true,
      "assigned_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "driver": {
        "id": "uuid",
        "email": "driver@university.edu",
        "first_name": "John",
        "last_name": "Driver"
      },
      "bus": {
        "id": "uuid",
        "code": "BUS001",
        "number_plate": "GJ-01-AB-1234"
      },
      "route": {
        "id": "uuid",
        "name": "Route 1",
        "description": "Main campus to downtown"
      }
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Create Assignment
```http
POST /assignments
Authorization: Bearer <token>
Content-Type: application/json

{
  "driver_id": "uuid",
  "bus_id": "uuid",
  "route_id": "uuid",
  "notes": "Regular assignment"
}
```

#### Update Assignment
```http
PUT /assignments/bus/{busId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "driver_id": "uuid",
  "route_id": "uuid",
  "status": "active",
  "notes": "Updated assignment"
}
```

#### Remove Assignment
```http
DELETE /assignments/bus/{busId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Assignment removed"
}
```

### Location Tracking

#### Get Bus Locations
```http
GET /locations/buses
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bus_id": "uuid",
      "driver_id": "uuid",
      "latitude": 23.0225,
      "longitude": 72.5714,
      "speed_kmh": 45.5,
      "heading": 180,
      "accuracy_m": 5.0,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Update Bus Location
```http
POST /locations/buses
Authorization: Bearer <token>
Content-Type: application/json

{
  "bus_id": "uuid",
  "latitude": 23.0225,
  "longitude": 72.5714,
  "speed_kmh": 45.5,
  "heading": 180,
  "accuracy_m": 5.0
}
```

### Admin Dashboard

#### Get Dashboard Data
```http
GET /admin/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBuses": 25,
    "activeBuses": 20,
    "totalRoutes": 8,
    "activeRoutes": 7,
    "totalDrivers": 30,
    "activeDrivers": 25,
    "recentActivity": [
      {
        "id": "uuid",
        "type": "bus_assigned",
        "description": "Bus BUS001 assigned to John Driver",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ],
    "systemHealth": {
      "status": "healthy",
      "uptime": 3600,
      "database": "connected",
      "api": "running"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Get System Health
```http
GET /admin/health
Authorization: Bearer <token>
```

#### Get Analytics
```http
GET /admin/analytics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBuses": 25,
    "activeBuses": 20,
    "totalRoutes": 8,
    "activeRoutes": 7,
    "totalDrivers": 30,
    "activeDrivers": 25,
    "averageDelay": 5.2,
    "busUsageStats": [
      {
        "date": "2024-01-01",
        "activeBuses": 20,
        "totalTrips": 150
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## WebSocket Events

### Connection
```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Bus Location Update
```javascript
socket.on('bus_location_update', (data) => {
  console.log('Bus location updated:', data);
  // data: {
  //   bus_id: 'uuid',
  //   driver_id: 'uuid',
  //   latitude: 23.0225,
  //   longitude: 72.5714,
  //   speed_kmh: 45.5,
  //   heading: 180,
  //   timestamp: '2024-01-01T00:00:00Z'
  // }
});
```

#### Driver Status Update
```javascript
socket.on('driver_status_update', (data) => {
  console.log('Driver status updated:', data);
  // data: {
  //   driver_id: 'uuid',
  //   status: 'online' | 'offline' | 'driving',
  //   bus_id: 'uuid',
  //   timestamp: '2024-01-01T00:00:00Z'
  // }
});
```

#### Assignment Update
```javascript
socket.on('assignment_update', (data) => {
  console.log('Assignment updated:', data);
  // data: {
  //   type: 'created' | 'updated' | 'removed',
  //   assignment: { ... },
  //   timestamp: '2024-01-01T00:00:00Z'
  // }
});
```

## Examples

### JavaScript/TypeScript SDK Usage

```typescript
import { BusTrackingAPI } from '@bustracking/sdk';

const api = new BusTrackingAPI({
  baseURL: 'http://localhost:3001',
  token: 'your-jwt-token'
});

// Get all buses
const buses = await api.buses.getAll();

// Create a new bus
const newBus = await api.buses.create({
  code: 'BUS003',
  number_plate: 'GJ-01-EF-9012',
  capacity: 55,
  model: 'Volvo',
  year: 2024
});

// Get real-time bus locations
api.websocket.on('bus_location_update', (location) => {
  console.log('Bus location:', location);
});
```

### React Hook Usage

```typescript
import { useBuses, useBusLocations } from '@bustracking/react-hooks';

function BusMap() {
  const { data: buses, loading } = useBuses();
  const { data: locations } = useBusLocations();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {buses?.map(bus => (
        <div key={bus.id}>
          {bus.code} - {bus.driver_full_name}
        </div>
      ))}
    </div>
  );
}
```

### cURL Examples

#### Get All Buses
```bash
curl -X GET "http://localhost:3001/buses" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json"
```

#### Create Bus
```bash
curl -X POST "http://localhost:3001/buses" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BUS004",
    "number_plate": "GJ-01-GH-3456",
    "capacity": 60,
    "model": "Mercedes",
    "year": 2024
  }'
```

#### Update Bus Location
```bash
curl -X POST "http://localhost:3001/locations/buses" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "bus_id": "uuid",
    "latitude": 23.0225,
    "longitude": 72.5714,
    "speed_kmh": 45.5,
    "heading": 180
  }'
```

## SDK Usage

### Installation
```bash
npm install @bustracking/sdk
```

### Basic Usage
```typescript
import { BusTrackingAPI } from '@bustracking/sdk';

const api = new BusTrackingAPI({
  baseURL: 'http://localhost:3001',
  token: 'your-jwt-token'
});

// Authentication
await api.auth.studentLogin('student@university.edu', 'password');

// Bus management
const buses = await api.buses.getAll();
const bus = await api.buses.getById('uuid');
const newBus = await api.buses.create(busData);

// Route management
const routes = await api.routes.getAll();
const route = await api.routes.getById('uuid');

// Assignment management
const assignments = await api.assignments.getAll();
const assignment = await api.assignments.create(assignmentData);

// Real-time updates
api.websocket.connect();
api.websocket.on('bus_location_update', handleLocationUpdate);
```

### React Hooks
```typescript
import { useBuses, useRoutes, useAssignments } from '@bustracking/react-hooks';

function AdminDashboard() {
  const { data: buses, loading: busesLoading } = useBuses();
  const { data: routes, loading: routesLoading } = useRoutes();
  const { data: assignments, loading: assignmentsLoading } = useAssignments();

  // Component implementation
}
```

## Rate Limits and Best Practices

### Rate Limits
- **General API:** 100 requests/minute per IP
- **Authentication:** 10 requests/minute per IP
- **WebSocket:** 1000 messages/minute per connection

### Best Practices
1. **Use WebSocket for real-time updates** instead of polling
2. **Implement exponential backoff** for retries
3. **Cache data** when appropriate
4. **Handle errors gracefully** with user-friendly messages
5. **Use pagination** for large datasets
6. **Validate input** before sending requests

### Error Handling
```typescript
try {
  const result = await api.buses.getAll();
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
} catch (error) {
  console.error('API Error:', error);
  // Handle error appropriately
}
```

## Support

For API support and questions:
- **Documentation:** [https://docs.bustracking.university.edu](https://docs.bustracking.university.edu)
- **Support Email:** support@bustracking.university.edu
- **GitHub Issues:** [https://github.com/university/bustracking/issues](https://github.com/university/bustracking/issues)

---

*Last updated: January 2024*
*API Version: 1.0.0*

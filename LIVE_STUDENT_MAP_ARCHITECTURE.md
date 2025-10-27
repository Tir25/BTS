# Live Student Map - How It Works

## Overview
The live student map is a real-time location tracking system that displays bus locations on an interactive map. Students can see where their buses are in real-time as drivers send location updates.

## Architecture Flow

### 1. Initial Data Loading (When Map First Loads)

#### Step 1: Map Initialization
- The `StudentMap` component initializes MapLibre GL map with OpenStreetMap tiles
- Sets up clustering, markers, and performance optimizations
- Map loads centered on Ahmedabad coordinates (23.025°N, 72.571°E)

#### Step 2: Load Initial Bus Data
**Viewport-Based Loading (Optimized)**
- Only loads buses visible in the current map viewport
- Reduces initial data transfer by ~80-90%
- API call: `GET /api/buses/viewport?bounds=[[west,south],[east,north]]`

```typescript
// From StudentMap.tsx lines 913-1009
const loadBusesInViewport = async () => {
  const bounds = map.current.getBounds();
  const viewportResponse = await apiService.getBusesInViewport(viewportBounds);
  // Converts API response to BusInfo format
  setBuses(convertedBuses);
  // Subscribes to WebSocket updates for visible buses
  unifiedWebSocketService.subscribeToBuses(busIds);
}
```

#### Step 3: Load Initial Live Locations
- API call: `GET /api/locations/current`
- Fetches current bus locations from database
- Pre-populates map with current positions before real-time updates start

```typescript
// From StudentMap.tsx lines 1053-1135
const loadLiveLocations = async () => {
  const response = await apiService.getLiveLocations();
  // Updates MapStore with initial locations
  response.data.forEach(location => {
    updateBusLocation(location);
    updateBusMarker(location);
  });
}
```

### 2. Real-Time Updates (WebSocket Connection)

#### Step 1: WebSocket Connection Setup
**Frontend Connection**
```typescript
// From UnifiedWebSocketService.ts lines 266-287
this.socket = io(wsUrl, {
  transports: ['websocket', 'polling'],
  auth: { token: authToken, clientType: 'student' },
  query: { clientType: 'student', version: '2.0.0' }
});
```

**Backend Authentication**
- Backend validates JWT token from WebSocket auth
- Assigns student to 'students' room
- Handles subscription to buses/routes

#### Step 2: Subscription Management
**Bus-Specific Subscriptions**
- When a bus is visible in viewport, student subscribes to that bus
- Subscription uses Socket.IO rooms: `bus:{busId}`
- Example: `unifiedWebSocketService.subscribeToBuses(['bus-1', 'bus-2'])`

**Route-Based Subscriptions**
- Students can also subscribe to entire routes
- Route room: `route:{routeId}`
- Updates all buses on a specific route

#### Step 3: Location Update Flow

**Driver Sends Location:**
```
Driver App → WebSocket → Backend
```

**Backend Processing:**
```typescript
// From websocket.ts lines 236-450
socket.on('driver:locationUpdate', async (data) => {
  // 1. Validate location data
  validateLocationData(data);
  
  // 2. Save to database (non-blocking)
  await optimizedLocationService.saveLocationUpdate(data);
  
  // 3. Calculate ETA and near-stop info (with timeout)
  const etaInfo = await RouteService.calculateETA(location, routeId);
  const nearStopInfo = await RouteService.checkBusNearStop(location, routeId);
  
  // 4. Broadcast to subscribed students
  const busRoom = `bus:${busId}`;
  const routeRoom = `route:${routeId}`;
  
  io.to(busRoom).emit('bus:locationUpdate', locationData);
  io.to(routeRoom).emit('bus:locationUpdate', locationData);
});
```

**Frontend Receives Update:**
```typescript
// From UnifiedWebSocketService.ts lines 400-436
this.socket.on('bus:locationUpdate', (location: BusLocation) => {
  // Notify all registered listeners (StudentMap components)
  this.busLocationListeners.forEach(listener => {
    listener(location);
  });
});
```

**StudentMap Processes Update:**
```typescript
// From StudentMap.tsx lines 1199-1250
handleBusLocationUpdateRef.current = (location: BusLocation) => {
  // 1. Update MapStore (centralized state)
  updateBusLocation(location);
  
  // 2. Update marker on map (with throttling)
  updateBusMarker(location);
  
  // 3. Calculate speed if needed
  const locationWithSpeed = busService.updateBusLocation(location);
};
```

### 3. Map Rendering & Display

#### Marker Management
**Marker Creation/Update:**
- Uses `MapService` to manage markers efficiently
- Throttles updates: only updates if bus moved >10m or >5 seconds passed
- Smooth marker animations for position changes

```typescript
// From StudentMap.tsx lines 411-458
const updateBusMarker = (location: BusLocation) => {
  // Check if significant movement occurred
  const distance = calculateDistance(lastPos, location);
  if (distance < 0.0001 && timeSinceLastUpdate < 5000) {
    return; // Skip update
  }
  
  // Update marker via MapService
  mapServiceRef.current.updateBusMarker(location.busId, location);
};
```

#### Clustering (Performance Optimization)
- When zoomed out, groups nearby buses into clusters
- Reduces markers rendered at once
- Automatically expands clusters when zooming in

```typescript
// From StudentMap.tsx lines 595-717
if (finalConfig.enableClustering) {
  mapServiceRef.current.setClusteringEnabled(true, 14, 50);
  // Updates clusters on zoom/move
  map.current.on('zoomend', () => {
    calculateClusters();
    mapServiceRef.current.updateClusters(currentLocations);
  });
}
```

#### Viewport Updates
- When map is panned/zoomed, reloads buses for new viewport
- Automatically subscribes to buses entering viewport
- Unsubscribes from buses leaving viewport (efficient bandwidth usage)

### 4. Data Storage & Persistence

#### Database Schema
**live_locations table:**
- Stores GPS coordinates (PostGIS geometry)
- Includes speed, heading, timestamp
- Indexed for fast spatial queries

**Database Query:**
```sql
-- From OptimizedLocationService.ts lines 171-261
SELECT 
  ll.id, ll.bus_id, 
  ST_AsText(ll.location) as location,
  ll.speed_kmh, ll.heading_degrees, ll.recorded_at,
  b.bus_number, b.vehicle_no,
  u.full_name as driver_name
FROM live_locations ll
LEFT JOIN buses b ON ll.bus_id = b.id
LEFT JOIN user_profiles u ON b.assigned_driver_profile_id = u.id
WHERE ll.recorded_at >= NOW() - INTERVAL '5 minutes'
ORDER BY ll.recorded_at DESC
```

#### Caching Strategy
- Query results cached for 30 seconds
- Viewport queries cached with TTL
- Reduces database load significantly

### 5. Performance Optimizations

#### 1. Viewport-Based Loading
- Only loads buses in visible area
- Reduces initial load by 80-90%

#### 2. WebSocket Room Subscriptions
- Only sends updates to subscribed clients
- Reduces bandwidth by ~97%

#### 3. Marker Update Throttling
- Skips updates if movement <10m or <5 seconds
- Reduces render overhead

#### 4. Clustering
- Groups nearby markers at low zoom levels
- Limits rendered markers to 50 at once

#### 5. Batch Updates
- Uses `requestAnimationFrame` for batched DOM updates
- Prevents excessive re-renders

#### 6. Offline Support
- Caches location data in IndexedDB
- Shows last known positions when offline

### 6. Error Handling & Resilience

#### Connection Resilience
- Automatic reconnection with exponential backoff
- Retries failed connections up to 3 times
- Falls back to polling if WebSocket fails

#### Data Fallbacks
- If viewport API fails → fallback to full bus list
- If WebSocket fails → falls back to periodic polling
- If offline → uses cached data from IndexedDB

#### Error States
- Shows connection status to user
- Displays error messages for failed operations
- Gracefully degrades functionality

## Data Flow Diagram

```
Driver GPS
    ↓
Driver App (tracks location)
    ↓
WebSocket → Backend
    ↓
├─→ Save to Database (live_locations)
├─→ Calculate ETA/NearStop
└─→ Broadcast to Students
    ↓
    ├─→ Bus Room (bus:{busId})
    ├─→ Route Room (route:{routeId})
    └─→ Fallback (all students)
    ↓
Student WebSocket Connection
    ↓
UnifiedWebSocketService
    ↓
StudentMap Component
    ↓
├─→ Update MapStore (state)
├─→ Update Marker on Map
└─→ Trigger UI Updates
```

## Key Technologies

- **Frontend:**
  - React + TypeScript
  - MapLibre GL (OpenStreetMap)
  - Socket.IO Client
  - Zustand (state management)

- **Backend:**
  - Node.js + Express
  - Socket.IO Server
  - PostgreSQL + PostGIS (spatial queries)
  - Supabase (database)

- **Optimizations:**
  - WebSocket rooms for targeted broadcasts
  - Viewport-based queries
  - Marker clustering
  - Query caching
  - Update throttling

## Real-Time Update Frequency

- **Driver Updates:** Every 1-5 seconds (based on movement)
- **Student Receives:** Instant via WebSocket (<100ms latency)
- **Marker Updates:** Throttled to ~1 update per 5 seconds or 10m movement
- **Database Storage:** Every location update saved with timestamp

## Summary

The live student map works by:
1. **Loading initial data** for buses in the current viewport
2. **Connecting via WebSocket** for real-time updates
3. **Subscribing to specific buses/routes** to reduce bandwidth
4. **Receiving location updates** as drivers send GPS coordinates
5. **Updating markers** on the map with throttling for performance
6. **Handling edge cases** with offline support, fallbacks, and error recovery

The system is optimized for performance, using viewport-based loading, room-based subscriptions, and intelligent throttling to handle hundreds of buses efficiently while providing smooth real-time updates to students.


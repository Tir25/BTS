# Data Flow Diagrams

## Overview

This document provides detailed data flow diagrams for the University Bus Tracking System, showing how data moves between different components, services, and users.

## 1. Overall System Data Flow

```mermaid
graph TB
    subgraph "User Interfaces"
        A[Student App]
        B[Driver App]
        C[Admin Dashboard]
    end
    
    subgraph "Frontend Layer"
        D[React Components]
        E[State Management]
        F[API Client]
    end
    
    subgraph "Backend API"
        G[Express Server]
        H[Route Handlers]
        I[Business Logic]
    end
    
    subgraph "Database Layer"
        J[PostgreSQL]
        K[PostGIS Extension]
        L[Live Locations]
    end
    
    subgraph "External Services"
        M[Supabase Auth]
        N[Supabase Storage]
        O[Supabase Realtime]
    end
    
    subgraph "Real-time Communication"
        P[WebSocket Server]
        Q[Socket.IO]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> E
    E --> F
    F --> G
    
    G --> H
    H --> I
    I --> J
    
    J --> K
    J --> L
    
    G --> M
    G --> N
    G --> O
    
    G --> P
    P --> Q
    Q --> D
```

## 2. Authentication Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth Service
    participant S as Supabase Auth
    participant B as Backend
    participant D as Database
    
    U->>F: Enter Credentials
    F->>A: Login Request
    A->>S: Authenticate User
    S->>A: JWT Token
    A->>B: Validate Token
    B->>D: Check User Role
    D->>B: User Data
    B->>A: User Info + Token
    A->>F: Store Token
    F->>U: Redirect to Dashboard
    
    Note over F: Token stored in localStorage
    Note over B: Token validated on each request
```

## 3. Real-time Location Tracking Data Flow

```mermaid
sequenceDiagram
    participant D as Driver App
    participant B as Backend API
    participant DB as Database
    participant WS as WebSocket Server
    participant S as Student App
    participant A as Admin Dashboard
    
    D->>D: Capture GPS Location
    D->>B: POST /location/update
    B->>B: Validate Location Data
    B->>DB: Store Location
    DB->>B: Confirmation
    B->>WS: Broadcast Update
    WS->>S: Location Update
    WS->>A: Location Update
    S->>S: Update Map Marker
    A->>A: Update Analytics
    
    Note over D: GPS coordinates + timestamp
    Note over DB: PostGIS point geometry
    Note over WS: Real-time broadcasting
```

## 4. Bus Management Data Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant S as Storage
    participant WS as WebSocket
    
    A->>F: Add New Bus
    F->>F: Upload Bus Image
    F->>S: Upload Image
    S->>F: Image URL
    F->>B: POST /buses
    B->>B: Validate Bus Data
    B->>DB: Insert Bus Record
    DB->>B: Bus ID
    B->>WS: Broadcast Bus Added
    WS->>F: Update Bus List
    B->>F: Success Response
    F->>A: Show Success Message
    
    Note over S: Supabase Storage
    Note over DB: UUID primary key
    Note over WS: Real-time updates
```

## 5. Route Management Data Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant G as Geospatial Engine
    
    A->>F: Create Route
    F->>F: Draw Route on Map
    F->>F: Extract Coordinates
    F->>B: POST /routes
    B->>B: Validate Route Data
    B->>G: Calculate Distance
    G->>B: Distance + Duration
    B->>DB: Insert Route (PostGIS)
    DB->>B: Route ID
    B->>F: Success Response
    F->>A: Show Route Created
    
    Note over G: PostGIS calculations
    Note over DB: LINESTRING geometry
```

## 6. File Upload Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Supabase Storage
    participant DB as Database
    
    U->>F: Select File
    F->>F: Validate File
    F->>B: POST /storage/upload
    B->>B: Validate File Type/Size
    B->>S: Upload File
    S->>B: Public URL
    B->>DB: Store File Reference
    DB->>B: File Record ID
    B->>F: File URL + Metadata
    F->>U: Show Upload Success
    
    Note over S: CDN distribution
    Note over DB: File metadata storage
```

## 7. WebSocket Communication Data Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Server
    participant A as Auth Middleware
    participant B as Backend
    participant DB as Database
    
    C->>WS: Connect
    WS->>A: Validate Token
    A->>WS: Authentication Result
    WS->>C: Connection Established
    
    C->>WS: Join Room
    WS->>C: Room Joined
    
    Note over WS: Real-time events
    WS->>C: Location Updates
    WS->>C: Bus Status Changes
    WS->>C: Route Updates
    WS->>C: System Alerts
    
    C->>WS: Disconnect
    WS->>C: Connection Closed
```

## 8. Analytics Data Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant AN as Analytics Engine
    
    A->>F: Request Analytics
    F->>B: GET /analytics/overview
    B->>DB: Query Bus Data
    B->>DB: Query Route Data
    B->>DB: Query Location Data
    DB->>B: Raw Data
    B->>AN: Process Analytics
    AN->>B: Calculated Metrics
    B->>F: Analytics Data
    F->>F: Generate Charts
    F->>A: Display Dashboard
    
    Note over AN: Statistical calculations
    Note over F: Chart.js/D3.js rendering
```

## 9. Error Handling Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant L as Logger
    participant DB as Database
    
    U->>F: User Action
    F->>B: API Request
    B->>B: Process Request
    
    alt Success
        B->>DB: Database Operation
        DB->>B: Success Response
        B->>F: Success Data
        F->>U: Update UI
    else Error
        B->>L: Log Error
        L->>DB: Store Error Log
        B->>F: Error Response
        F->>F: Handle Error
        F->>U: Show Error Message
    end
    
    Note over L: Error tracking service
    Note over DB: Error logs table
```

## 10. Data Synchronization Flow

```mermaid
sequenceDiagram
    participant A as App
    participant C as Cache
    participant B as Backend
    participant DB as Database
    participant Q as Queue
    
    A->>A: Check Network
    alt Online
        A->>B: Sync Request
        B->>DB: Get Latest Data
        DB->>B: Data
        B->>A: Sync Response
        A->>C: Update Cache
    else Offline
        A->>C: Load Cached Data
        A->>Q: Queue Updates
        loop Network Monitoring
            A->>A: Check Connection
            alt Connection Restored
                A->>Q: Process Queue
                Q->>B: Send Updates
                B->>DB: Update Database
                B->>A: Confirmation
                A->>Q: Clear Queue
            end
        end
    end
    
    Note over C: Local storage/cache
    Note over Q: Offline queue
```

## 11. Security Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant M as Middleware
    participant B as Backend
    participant DB as Database
    
    U->>F: Request Protected Resource
    F->>F: Add Auth Header
    F->>B: HTTP Request
    B->>M: Authentication Check
    M->>M: Validate JWT Token
    M->>M: Check User Role
    M->>M: Rate Limit Check
    
    alt Valid Request
        M->>B: Authenticated Request
        B->>DB: Database Query
        DB->>B: Data
        B->>F: Response
        F->>U: Display Data
    else Invalid Request
        M->>F: 401/403 Response
        F->>U: Show Error
    end
    
    Note over M: Security middleware
    Note over DB: Row-level security
```

## 12. Performance Monitoring Data Flow

```mermaid
sequenceDiagram
    participant S as System
    participant M as Monitor
    participant DB as Database
    participant A as Alert System
    participant L as Logs
    
    S->>M: Performance Metrics
    M->>M: Analyze Metrics
    M->>DB: Store Metrics
    M->>L: Log Performance
    
    alt Performance Issue
        M->>A: Trigger Alert
        A->>A: Send Notification
        A->>L: Log Alert
    else Normal Performance
        M->>M: Continue Monitoring
    end
    
    Note over M: Real-time monitoring
    Note over A: Email/SMS alerts
```

## Data Flow Patterns

### 1. Request-Response Pattern
- **Use Case**: CRUD operations, data retrieval
- **Flow**: Client → API → Database → Response
- **Example**: Fetching bus list, creating new routes

### 2. Real-time Broadcasting Pattern
- **Use Case**: Location updates, status changes
- **Flow**: Source → WebSocket → All Connected Clients
- **Example**: Bus location updates, system alerts

### 3. Event-Driven Pattern
- **Use Case**: Asynchronous operations, notifications
- **Flow**: Event → Queue → Processing → Notification
- **Example**: File upload completion, error alerts

### 4. Caching Pattern
- **Use Case**: Frequently accessed data, performance optimization
- **Flow**: Request → Cache Check → Database (if needed) → Cache Update
- **Example**: Route data, user preferences

### 5. Offline-First Pattern
- **Use Case**: Mobile applications, network resilience
- **Flow**: Local Cache → Sync Queue → Server Sync
- **Example**: Driver app location updates

## Data Transformation Points

### 1. Frontend Data Transformation
```typescript
// API Response to UI State
interface ApiResponse {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface UIState {
  position: [number, number];
  lastUpdate: Date;
  isActive: boolean;
}

// Transformation
const transformLocation = (apiData: ApiResponse): UIState => ({
  position: [apiData.latitude, apiData.longitude],
  lastUpdate: new Date(apiData.timestamp),
  isActive: true
});
```

### 2. Backend Data Transformation
```typescript
// Database to API Response
interface DatabaseRecord {
  id: string;
  location: string; // PostGIS geometry
  recorded_at: Date;
}

interface ApiResponse {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// Transformation
const transformLocationRecord = (dbRecord: DatabaseRecord): ApiResponse => {
  const coords = parsePostGIS(dbRecord.location);
  return {
    id: dbRecord.id,
    latitude: coords.lat,
    longitude: coords.lng,
    timestamp: dbRecord.recorded_at.toISOString()
  };
};
```

### 3. Geospatial Data Transformation
```typescript
// Coordinate System Transformations
interface WGS84Coordinates {
  latitude: number;
  longitude: number;
}

interface ProjectedCoordinates {
  x: number;
  y: number;
  srid: number;
}

// Transform WGS84 to Web Mercator for map display
const transformToWebMercator = (coords: WGS84Coordinates): ProjectedCoordinates => {
  // PostGIS ST_Transform calculation
  return {
    x: calculateX(coords.longitude),
    y: calculateY(coords.latitude),
    srid: 3857
  };
};
```

These data flow diagrams provide a comprehensive understanding of how data moves through the University Bus Tracking System, from user interactions to database storage and real-time communication.

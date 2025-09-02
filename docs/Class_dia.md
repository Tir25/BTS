# Bus Tracking System - Simplified Class Diagram

## Core System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                BUS TRACKING SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   BACKEND       │    │   FRONTEND      │    │   DATABASE      │            │
│  │                 │    │                 │    │                 │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENTITIES                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │    USER     │     │     BUS     │     │    ROUTE    │     │   DRIVER    │  │
│  │             │     │             │     │             │     │             │  │
│  │ +id         │     │ +id         │     │ +id         │     │ +id         │  │
│  │ +email      │     │ +code       │     │ +name       │     │ +driver_id  │  │
│  │ +role       │     │ +number_plate│    │ +geom       │     │ +driver_name│  │
│  │ +first_name │     │ +capacity   │     │ +stops      │     │ +license_no │  │
│  │ +last_name  │     │ +model      │     │ +distance_km│     │ +phone      │  │
│  │ +phone      │     │ +is_active  │     │ +is_active  │     │ +email      │  │
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘  │
│         │                     │                     │                     │     │
│         │                     │                     │                     │     │
│         └─────────────────────┼─────────────────────┼─────────────────────┘     │
│                               │                     │                           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │   LOCATION  │     │  BUS_STOP   │     │ ASSIGNMENT  │     │   ETA_INFO  │  │
│  │             │     │             │     │             │     │             │  │
│  │ +id         │     │ +id         │     │ +id         │     │ +bus_id     │  │
│  │ +bus_id     │     │ +route_id   │     │ +driver_id  │     │ +route_id   │  │
│  │ +location   │     │ +name       │     │ +bus_id     │     │ +current_loc│  │
│  │ +speed_kmh  │     │ +location   │     │ +route_id   │     │ +next_stop  │  │
│  │ +heading    │     │ +stop_order │     │ +is_active  │     │ +distance   │  │
│  │ +timestamp  │     │ +is_active  │     │ +assigned_at│     │ +eta_minutes│  │
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              BACKEND SERVICES                               │ │
│  │                                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │AdminService │  │RouteService │  │LocationService│ │StorageService│        │ │
│  │  │             │  │             │  │             │  │             │        │ │
│  │  │+getAllBuses()│  │+getAllRoutes()│ │+saveLocation()│ │+uploadFile() │        │ │
│  │  │+createBus() │  │+createRoute()│  │+getLiveLocation()│ │+deleteFile() │        │ │
│  │  │+updateBus() │  │+updateRoute()│  │+getLocationHistory()│ │+getFileUrl() │        │ │
│  │  │+deleteBus() │  │+deleteRoute()│  │+updateBusLocation()│ │             │        │ │
│  │  │+getAnalytics()│ │+calculateETA()│  │+getDriverBusInfo()│ │             │        │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              FRONTEND SERVICES                              │ │
│  │                                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │AuthService  │  │WebSocketService│ │BusService   │ │MapService    │        │ │
│  │  │             │  │             │  │             │  │             │        │ │
│  │  │+signIn()    │  │+connect()   │  │+getAllBuses()│ │+initializeMap()│        │ │
│  │  │+signOut()   │  │+disconnect()│  │+getBusById()│  │+addBusMarker()│        │ │
│  │  │+getCurrentUser()│ │+emit()      │  │+getBusLocation()│ │+updateBusLocation()│        │ │
│  │  │+onAuthStateChange()│ │+on()        │  │+updateBusLocation()│ │+addRoutePath() │        │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            REACT COMPONENTS                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              MAIN APP                                       │ │
│  │                                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │DriverDashboard│ │StudentMap   │  │AdminDashboard│ │AuthComponents│        │ │
│  │  │             │  │             │  │             │  │             │        │ │
│  │  │+render()    │  │+render()    │  │+render()    │  │+render()    │        │ │
│  │  │+handleLocation()│ │+initializeMap()│ │+handleUserMgmt()│ │+handleLogin() │        │ │
│  │  │+handleRoute()│  │+updateBusMarkers()│ │+handleBusMgmt()│ │+handleLogout()│        │ │
│  │  │+handleTrip()│   │+handleBusSelection()│ │+handleRouteMgmt()│ │+handleAuthState()│        │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              STATE MANAGEMENT                               │ │
│  │                                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │useAuthStore │  │useBusStore  │  │useLocationStore│ │useApiQueries│        │ │
│  │  │             │  │             │  │             │  │             │        │ │
│  │  │+isAuthenticated│ │+buses      │  │+liveLocations│  │+useHealthCheck()│        │ │
│  │  │+user        │  │+selectedBus │  │+locationHistory│ │+useBuses()  │        │ │
│  │  │+setUser()   │  │+setBuses()  │  │+updateLiveLocation()│ │+useRoutes() │        │ │
│  │  │+setLoading()│  │+fetchBuses()│  │+getLocationHistory()│ │+useAnalytics()│        │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │   DRIVER    │────▶│  WEBSOCKET  │────▶│   BACKEND   │────▶│  DATABASE   │  │
│  │  (Mobile)   │     │   SERVICE   │     │   SERVER    │     │ (PostgreSQL)│  │
│  │             │     │             │     │             │     │             │  │
│  │ +Location   │     │ +Real-time  │     │ +Process    │     │ +Store      │  │
│  │ +Speed      │     │ +Events     │     │ +Validate   │     │ +Query      │  │
│  │ +Heading    │     │ +Broadcast  │     │ +Calculate  │     │ +Index      │  │
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘  │
│         ▲                     │                     │                     │     │
│         │                     │                     │                     │     │
│         │                     ▼                     ▼                     │     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │   STUDENT   │◀────│  REACT APP  │◀────│   API       │◀────│   CACHE     │  │
│  │  (Web/Mobile)│     │             │     │  ENDPOINTS  │     │ (Redis/Opt) │  │
│  │             │     │             │     │             │     │             │  │
│  │ +View Map   │     │ +State Mgmt │     │ +REST API   │     │ +Session    │  │
│  │ +Track Bus  │     │ +Components │     │ +WebSocket  │     │ +Location   │  │
│  │ +Get ETA    │     │ +Services   │     │ +Auth       │     │ +Analytics  │  │
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Key Relationships Summary

### 1. **User Management**
- **User** → **Driver** (One-to-One): Each driver is a user with additional driver-specific data
- **User** → **Role** (Many-to-One): Users can have roles (student, driver, admin)

### 2. **Bus Management**
- **Bus** → **Driver** (Many-to-One): Each bus can be assigned to one driver
- **Bus** → **Route** (Many-to-One): Each bus can be assigned to one route
- **Bus** → **Location** (One-to-Many): Each bus has multiple location records over time

### 3. **Route Management**
- **Route** → **BusStop** (One-to-Many): Each route contains multiple bus stops
- **Route** → **Bus** (One-to-Many): Each route can have multiple buses assigned

### 4. **Assignment Management**
- **DriverBusAssignment** (Junction Table): Manages the many-to-many relationship between drivers, buses, and routes

### 5. **Location Tracking**
- **Bus** → **LiveLocation** (One-to-Many): Real-time location updates
- **Bus** → **LocationHistory** (One-to-Many): Historical location data
- **Location** → **ETAInfo** (One-to-One): Estimated arrival information

### 6. **Service Dependencies**
- **WebSocketService** → **LocationService**: Real-time location updates
- **AuthService** → **DatabaseUser**: User authentication
- **MapService** → **BusService**: Map display and bus tracking
- **AdminService** → **All Entities**: Administrative operations

## Technology Stack Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            TECHNOLOGY STACK                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   FRONTEND  │  │   BACKEND   │  │  DATABASE   │  │   SERVICES  │            │
│  │             │  │             │  │             │  │             │            │
│  │ • React     │  │ • Node.js   │  │ • PostgreSQL│  │ • Supabase  │            │
│  │ • TypeScript│  │ • Express   │  │ • PostGIS   │  │ • Auth      │            │
│  │ • Vite      │  │ • Socket.IO │  │ • Redis     │  │ • Storage   │            │
│  │ • Zustand   │  │ • JWT       │  │ • Indexes   │  │ • Real-time │            │
│  │ • Leaflet   │  │ • CORS      │  │ • Triggers  │  │ • Analytics │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

This simplified class diagram provides a clear overview of the bus tracking system's architecture, showing the key entities, their relationships, and how the different layers interact to provide real-time bus tracking functionality.

# 🎯 Bus Tracking System - UML Diagrams for System Modeling

## 📋 **UML DIAGRAMS OVERVIEW**

This document provides comprehensive UML (Unified Modeling Language) diagrams for the Ganpat University Bus Tracking System, covering all aspects of system modeling from user interactions to technical architecture.

---

## 🎭 **1. USE CASE DIAGRAM (User Interaction Scenarios)**

### **System Actors:**
- **Driver**: Bus operators who update locations and follow routes
- **Student**: End users who track buses and view ETAs
- **Admin**: System administrators who manage users, routes, and buses
- **System**: Automated processes like ETA calculation and notifications

### **Driver Use Cases:**
- Authenticate User (<<include>>)
- Login to System
- View Assigned Route
- Update Bus Location
- Start/End Route
- View Navigation
- Report Issues

### **Student Use Cases:**
- Authenticate User (<<include>>)
- Login to System
- View Bus Location
- View Route Information
- Set Notifications
- View ETA Information
- Report Bus Issues

### **Admin Use Cases:**
- Authenticate User (<<include>>)
- Login to System
- Manage Users
- Manage Routes
- Manage Buses
- Assign Drivers
- Monitor System
- View Analytics
- Generate Reports

### **System Use Cases:**
- Calculate ETA
- Send Notifications
- Update Database
- Broadcast Updates

---

## 🔄 **2. ACTIVITY DIAGRAM (Workflow Representation)**

### **Driver Workflow:**
```
[Start] → [Driver Login] → [Authentication] → [Load Dashboard]
    ↓
[View Assigned Route] → [Start Route] → [Enable GPS Tracking] → [Update Location]
    ↓
[Navigation Display] → [Real-time Updates] → [WebSocket Connection] → [Location Broadcast]
    ↓
[Route Progress] → [Stop Proximity] → [ETA Calculation] → [End Route]
    ↓
[Logout] → [Disconnect] → [End]
```

### **Student Workflow:**
```
[Start] → [Access Student Map] → [WebSocket Connection] → [Load Map Interface]
    ↓
[View Bus Locations] → [Select Bus] → [View Route Details] → [Set Notifications]
    ↓
[Real-time Updates] → [ETA Display] → [Arrival Alerts] → [Close Application]
    ↓
[Disconnect] → [End]
```

### **Admin Workflow:**
```
[Start] → [Admin Login] → [Authentication] → [Load Admin Dashboard]
    ↓
[View System Overview] → [Manage Users] → [Manage Routes] → [Manage Buses]
    ↓
[Assign Drivers] → [Monitor System] → [View Analytics] → [Generate Reports]
    ↓
[System Maintenance] → [Logout] → [End]
```

---

## 🏗️ **3. CLASS DIAGRAM (Object-Oriented Structure)**

### **User Management Classes:**

**+User (Base Class)**
- -id: UUID
- -email: String
- -role: UserRole
- -firstName: String
- -lastName: String
- -phone: String
- -createdAt: DateTime
- -updatedAt: DateTime
- -profilePhotoUrl: String

**Methods:**
- +login(email: String, password: String): Promise<AuthResult>
- +logout(): Promise<void>
- +updateProfile(profile: UserProfile): Promise<void>
- +getRole(): UserRole
- +isAuthenticated(): boolean

**Inheritance:**
- **+Driver** (inherits from User)
  - -driverId: UUID
  - -licenseNo: String
  - -phone: String
  - -photoUrl: String
  - +updateLocation()
  - +viewRoute()
  - +startRoute()
  - +endRoute()
  - +reportIssue()

- **+Student** (inherits from User)
  - -studentId: UUID
  - -notifications: Array
  - -preferences: Object
  - -favoriteRoutes: Array
  - +viewBusLocation()
  - +setNotifications()
  - +viewETA()
  - +reportIssue()
  - +getNotifications()

- **+Admin** (inherits from User)
  - -adminId: UUID
  - -permissions: Array
  - -accessLevel: AccessLevel
  - -lastLogin: DateTime
  - +manageUsers()
  - +manageRoutes()
  - +manageBuses()
  - +assignDrivers()
  - +monitorSystem()

### **Transportation Classes:**

**+Route**
- -id: UUID
- -name: String
- -description: String
- -geometry: PostGISGeometry
- -totalDistance: number
- -estimatedDuration: number
- -isActive: boolean
- -origin: String
- -destination: String
- -stops: Array<BusStop>
- -createdAt: DateTime
- -updatedAt: DateTime

**Methods:**
- +calculateETA(currentLocation: Point): number
- +getStops(): Array<BusStop>
- +isNearStop(location: Point): boolean
- +getDistance(): number
- +activate(): void
- +deactivate(): void

**+Bus**
- -id: UUID
- -code: String
- -name: String
- -routeId: UUID
- -driverId: UUID
- -numberPlate: String
- -capacity: number
- -model: String
- -year: number
- -isActive: boolean
- -currentLocation: Point
- -speed: number
- -heading: number
- -createdAt: DateTime
- -updatedAt: DateTime

**Methods:**
- +updateLocation(location: Point): void
- +assignDriver(driverId: UUID): void
- +assignRoute(routeId: UUID): void
- +getCurrentLocation(): Point
- +getETA(): number
- +isOnRoute(): boolean
- +activate(): void
- +deactivate(): void

**+BusStop**
- -id: UUID
- -routeId: UUID
- -name: String
- -description: String
- -location: Point
- -stopOrder: number
- -estimatedTimeFromStart: number
- -isActive: boolean
- -createdAt: DateTime
- -updatedAt: DateTime

**Methods:**
- +getLocation(): Point
- +getETA(): number
- +isNearby(location: Point, radius: number): boolean
- +activate(): void
- +deactivate(): void

### **Service Layer Classes:**

**+AuthService**
- -currentUser: User
- -currentSession: Session
- -isInitialized: boolean

**Methods:**
- +signIn(email: string, password: string): Promise<AuthResult>
- +signOut(): Promise<void>
- +getCurrentUser(): User
- +isAuthenticated(): boolean
- +hasRole(role: string): boolean
- +validateToken(): Promise<boolean>

**+BusService**
- -buses: Map<string, BusInfo>
- -previousLocations: Map<string, Point>

**Methods:**
- +updateBusLocation(location: BusLocation): void
- +getBus(busId: string): BusInfo
- +getAllBuses(): Array<BusInfo>
- +getBusesByRoute(routeName: string): Array<BusInfo>
- +syncBusFromAPI(busId: string): Promise<void>
- +clearBuses(): void

**+WebSocketService**
- -socket: Socket
- -isConnected: boolean
- -connectionState: ConnectionState
- -reconnectAttempts: number
- -heartbeatInterval: number

**Methods:**
- +connect(): Promise<void>
- +disconnect(): void
- +emit(event: string, data: any): void
- +on(event: string, callback: Function): void
- +authenticate(token: string): Promise<void>
- +broadcastLocation(location: LocationData): void
- +handleReconnection(): void

---

## 🔄 **4. SEQUENCE DIAGRAM (Interaction Between Components)**

### **Student Tracking Bus Location:**

```
Student → Frontend App → WebSocket Service → Backend API → Database

1. Student: Access Map
2. Frontend App: Initialize WebSocket
3. WebSocket Service: Connect
4. Backend API: Authenticate
5. Database: Return Auth
6. WebSocket Service: Connected
7. Frontend App: Map Loaded
8. Student: View Buses
9. Frontend App: Request Bus Locations
10. WebSocket Service: Get Live Locations
11. Backend API: Query DB
12. Database: Return Locations
13. WebSocket Service: Bus Data
14. Frontend App: Display Buses
15. Student: Real-time Updates
```

### **Driver Location Update:**

```
Driver → Driver App → WebSocket Service → Backend API → Database

1. Driver: GPS Update
2. Driver App: Process Location
3. WebSocket Service: Validate & Process
4. Backend API: Store Location
5. Database: Update Success
6. WebSocket Service: Broadcast Update
7. Driver App: Update UI
8. Driver: Confirmation
```

### **Admin User Management:**

```
Admin → Admin App → Auth Service → Backend API → Database

1. Admin: Login
2. Admin App: Authenticate
3. Auth Service: Validate Credentials
4. Backend API: Check User
5. Database: Return User
6. Auth Service: Auth Token
7. Admin App: Dashboard
8. Admin: Manage Users
9. Admin App: CRUD Operations
10. Backend API: Database Operations
11. Database: Execute Query
12. Database: Return Result
13. Backend API: Success Response
14. Admin App: Update UI
15. Admin: Confirmation
```

---

## 🤝 **5. COLLABORATION DIAGRAM (System Communication)**

### **System Architecture Layers:**

**Frontend Layer:**
- DriverDashboard.tsx: Real-time location updates, navigation display, route progress tracking, issue reporting
- EnhancedStudentMap.tsx: Live bus tracking, route visualization, ETA calculations, stop information, notification settings
- AdminDashboard.tsx: Fleet management, user administration, route management, analytics dashboard, report generation, system configuration

**Service Layer:**
- websocket.ts: Connection management, authentication handling, event emission/listening, reconnection logic
- authService.ts: User authentication, session management, role-based access control, token validation, profile management
- busService.ts: Bus location management, route assignment, ETA calculations, speed calculations, historical data tracking, performance optimization

**Backend Layer:**
- server.ts: Express server setup, route handlers, middleware configuration, error handling
- database.ts: Connection pooling, query optimization, transaction management, health monitoring, backup and recovery

**Database Layer:**
- Supabase Database: Data persistence, spatial queries, real-time updates

### **Communication Patterns:**

1. **Driver → System**: GPS location updates, route status
2. **Student → System**: Bus location requests, ETA queries
3. **Admin → System**: User management, system monitoring
4. **System → Database**: Data persistence, spatial queries
5. **WebSocket → Clients**: Real-time broadcasting
6. **Services → API**: Business logic processing
7. **Frontend → Backend**: REST API communication
8. **Database → Services**: Data retrieval and storage

### **Data Flow Patterns:**

- **Real-time**: WebSocket → Broadcast → Clients
- **Authentication**: Auth Service → Database → Token
- **Location Updates**: GPS → Process → Store → Broadcast
- **User Management**: Admin → API → Database → Response
- **Map Rendering**: Service → API → Database → Visualization

---

## 🎯 **PRESENTATION NOTES**

### **Key UML Features to Highlight:**

1. **Comprehensive System Modeling** - Complete UML coverage from use cases to implementation
2. **Object-Oriented Design** - Proper inheritance and encapsulation patterns
3. **Real-time Communication** - WebSocket-based live updates
4. **Multi-role Architecture** - Driver, Student, and Admin interfaces
5. **Service-Oriented Design** - Modular service layer architecture
6. **Database Integration** - Spatial data and real-time persistence

### **Technical Achievements:**

1. **UML Compliance** - Standard UML 2.x notation and diagrams
2. **System Architecture** - Clear separation of concerns
3. **Communication Patterns** - Well-defined interaction flows
4. **Scalability Design** - Modular and extensible architecture
5. **Real-time Capabilities** - Live data flow and broadcasting

### **Business Value:**

1. **Clear System Understanding** - Visual representation of complex interactions
2. **Development Guidance** - Detailed implementation roadmap
3. **Stakeholder Communication** - Professional documentation for presentations
4. **Maintenance Planning** - Clear system structure for future development
5. **Quality Assurance** - Comprehensive system modeling for testing

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**UML Standard**: UML 2.x  
**System Status**: Production Ready

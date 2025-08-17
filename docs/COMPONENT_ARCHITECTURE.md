# Component Architecture

## Overview

This document provides a detailed view of the component architecture for the University Bus Tracking System, including both frontend React components and backend service architecture.

## Frontend Component Architecture

```mermaid
graph TB
    subgraph "Frontend Application"
        subgraph "App.tsx (Root Component)"
            A[App Component]
        end
        
        subgraph "Authentication Components"
            B[AdminLogin.tsx]
            C[LoginForm.tsx]
        end
        
        subgraph "Student Interface"
            D[StudentMap.tsx]
            E[BusTracker.tsx]
            F[RouteViewer.tsx]
        end
        
        subgraph "Driver Interface"
            G[DriverInterface.tsx]
            H[LocationSharer.tsx]
            I[NavigationPanel.tsx]
        end
        
        subgraph "Admin Interface"
            J[AdminDashboard.tsx]
            K[AdminPanel.tsx]
            L[StreamlinedManagement.tsx]
            M[UnifiedManagement.tsx]
        end
        
        subgraph "Shared Components"
            N[FileUpload.tsx]
            O[MediaManagement.tsx]
            P[MapComponent.tsx]
            Q[LoadingSpinner.tsx]
            R[ErrorBoundary.tsx]
        end
        
        subgraph "Services Layer"
            S[api.ts]
            T[authService.ts]
            U[busService.ts]
            V[storageService.ts]
            W[websocket.ts]
        end
        
        subgraph "Configuration"
            X[environment.ts]
            Y[supabase.ts]
        end
    end
    
    A --> B
    A --> C
    A --> D
    A --> G
    A --> J
    
    D --> E
    D --> F
    D --> P
    
    G --> H
    G --> I
    G --> P
    
    J --> K
    J --> L
    J --> M
    J --> N
    J --> O
    
    B --> S
    C --> T
    D --> U
    G --> U
    J --> U
    N --> V
    D --> W
    G --> W
    J --> W
    
    S --> X
    T --> Y
    U --> X
    V --> Y
    W --> X
```

## Backend Service Architecture

```mermaid
graph TB
    subgraph "Backend Application"
        subgraph "Server Entry Point"
            A[server.ts]
        end
        
        subgraph "Route Handlers"
            B[admin.ts]
            C[buses.ts]
            D[routes.ts]
            E[health.ts]
            F[storage.ts]
        end
        
        subgraph "Service Layer"
            G[adminService.ts]
            H[locationService.ts]
            I[routeService.ts]
            J[storageService.ts]
        end
        
        subgraph "Middleware"
            K[auth.ts]
            L[cors.ts]
            M[rateLimit.ts]
            N[validation.ts]
        end
        
        subgraph "Configuration"
            O[database.ts]
            P[environment.ts]
            Q[supabase.ts]
        end
        
        subgraph "WebSocket"
            R[websocket.ts]
        end
        
        subgraph "Database Models"
            S[database.ts]
        end
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    A --> R
    
    B --> G
    C --> H
    D --> I
    F --> J
    
    A --> K
    A --> L
    A --> M
    A --> N
    
    G --> O
    H --> O
    I --> O
    J --> Q
    
    O --> S
    P --> O
    Q --> J
```

## Component Details

### Frontend Components

#### 1. Core Application Components

**App.tsx**
- **Purpose**: Root component that manages routing and global state
- **Responsibilities**: 
  - Route management
  - Authentication state
  - Global error handling
  - Theme management

**AdminLogin.tsx**
- **Purpose**: Admin authentication interface
- **Features**:
  - Email/password login
  - JWT token management
  - Role-based access control
  - Error handling

#### 2. Student Interface Components

**StudentMap.tsx**
- **Purpose**: Main map interface for students
- **Features**:
  - Real-time bus tracking
  - Interactive map display
  - Route visualization
  - ETA calculations

**BusTracker.tsx**
- **Purpose**: Bus location tracking component
- **Features**:
  - Live bus positions
  - Speed and heading display
  - Bus information panel
  - Location history

**RouteViewer.tsx**
- **Purpose**: Route display and navigation
- **Features**:
  - Route path visualization
  - Stop locations
  - Distance and time estimates
  - Route selection

#### 3. Driver Interface Components

**DriverInterface.tsx**
- **Purpose**: Main driver application interface
- **Features**:
  - Location sharing controls
  - Route navigation
  - Status updates
  - Emergency alerts

**LocationSharer.tsx**
- **Purpose**: GPS location sharing component
- **Features**:
  - GPS permission handling
  - Location accuracy settings
  - Manual location input
  - Sharing status indicators

**NavigationPanel.tsx**
- **Purpose**: Route navigation assistance
- **Features**:
  - Turn-by-turn directions
  - Route deviation alerts
  - ETA updates
  - Traffic information

#### 4. Admin Interface Components

**AdminDashboard.tsx**
- **Purpose**: Main admin control panel
- **Features**:
  - System overview
  - Real-time statistics
  - Quick actions
  - Alert management

**AdminPanel.tsx**
- **Purpose**: Administrative controls
- **Features**:
  - User management
  - System configuration
  - Access control
  - Settings management

**StreamlinedManagement.tsx**
- **Purpose**: Simplified management interface
- **Features**:
  - Bus fleet management
  - Route management
  - Driver assignment
  - Quick operations

**UnifiedManagement.tsx**
- **Purpose**: Comprehensive management interface
- **Features**:
  - Full system control
  - Advanced analytics
  - Detailed reporting
  - System monitoring

#### 5. Shared Components

**FileUpload.tsx**
- **Purpose**: File upload functionality
- **Features**:
  - Drag-and-drop upload
  - File validation
  - Progress indicators
  - Error handling

**MediaManagement.tsx**
- **Purpose**: Media file management
- **Features**:
  - Image gallery
  - Document viewer
  - File organization
  - Bulk operations

**MapComponent.tsx**
- **Purpose**: Reusable map component
- **Features**:
  - Leaflet integration
  - Custom markers
  - Interactive controls
  - Responsive design

### Backend Components

#### 1. Route Handlers

**admin.ts**
- **Purpose**: Admin-specific API endpoints
- **Endpoints**:
  - User management
  - System configuration
  - Analytics and reporting
  - Access control

**buses.ts**
- **Purpose**: Bus management API
- **Endpoints**:
  - CRUD operations for buses
  - Bus assignment
  - Status updates
  - Location tracking

**routes.ts**
- **Purpose**: Route management API
- **Endpoints**:
  - Route CRUD operations
  - Geospatial queries
  - Route optimization
  - Stop management

**storage.ts**
- **Purpose**: File storage API
- **Endpoints**:
  - File upload/download
  - Image processing
  - Document management
  - CDN integration

#### 2. Service Layer

**adminService.ts**
- **Purpose**: Admin business logic
- **Functions**:
  - User management
  - System analytics
  - Configuration management
  - Reporting generation

**locationService.ts**
- **Purpose**: Location tracking logic
- **Functions**:
  - GPS data processing
  - ETA calculations
  - Route matching
  - Geospatial queries

**routeService.ts**
- **Purpose**: Route management logic
- **Functions**:
  - Route optimization
  - Distance calculations
  - Stop management
  - Schedule handling

**storageService.ts**
- **Purpose**: File storage logic
- **Functions**:
  - File validation
  - Upload processing
  - Image optimization
  - Storage management

#### 3. Middleware

**auth.ts**
- **Purpose**: Authentication middleware
- **Functions**:
  - JWT validation
  - Role verification
  - Session management
  - Access control

**cors.ts**
- **Purpose**: Cross-origin resource sharing
- **Functions**:
  - CORS configuration
  - Security headers
  - Request validation
  - Response handling

**rateLimit.ts**
- **Purpose**: Rate limiting middleware
- **Functions**:
  - Request throttling
  - IP-based limiting
  - Burst protection
  - Abuse prevention

## Component Communication

### Frontend Communication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant S as Service
    participant A as API
    participant B as Backend
    
    U->>C: User Action
    C->>S: Service Call
    S->>A: API Request
    A->>B: HTTP Request
    B->>A: Response
    A->>S: Data
    S->>C: State Update
    C->>U: UI Update
```

### Backend Communication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Route
    participant M as Middleware
    participant S as Service
    participant D as Database
    
    C->>R: HTTP Request
    R->>M: Authentication
    M->>R: Validated Request
    R->>S: Business Logic
    S->>D: Database Query
    D->>S: Data
    S->>R: Response
    R->>C: HTTP Response
```

## State Management

### Frontend State Structure

```typescript
interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  
  // Bus Tracking
  buses: Bus[];
  selectedBus: Bus | null;
  busLocations: Map<string, Location>;
  
  // Routes
  routes: Route[];
  selectedRoute: Route | null;
  
  // UI State
  loading: boolean;
  error: string | null;
  notifications: Notification[];
  
  // Map State
  mapCenter: [number, number];
  mapZoom: number;
  mapLayers: MapLayer[];
}
```

### Backend State Management

```typescript
interface ServerState {
  // Database Connections
  dbPool: Pool;
  supabaseClient: SupabaseClient;
  
  // WebSocket Connections
  connectedClients: Map<string, Socket>;
  userRooms: Map<string, string[]>;
  
  // Caching
  busCache: Map<string, Bus>;
  routeCache: Map<string, Route>;
  
  // System Metrics
  activeConnections: number;
  requestCount: number;
  errorCount: number;
}
```

## Component Dependencies

### Frontend Dependencies

```mermaid
graph LR
    A[React] --> B[TypeScript]
    B --> C[Vite]
    C --> D[Tailwind CSS]
    D --> E[Leaflet]
    E --> F[Socket.IO Client]
    F --> G[Axios]
    G --> H[Supabase Client]
```

### Backend Dependencies

```mermaid
graph LR
    A[Node.js] --> B[Express]
    B --> C[TypeScript]
    C --> D[PostgreSQL]
    D --> E[PostGIS]
    E --> F[Socket.IO]
    F --> G[Supabase]
    G --> H[JWT]
```

This component architecture provides a clear understanding of how the University Bus Tracking System is structured, from the user interface components to the backend services and data management.

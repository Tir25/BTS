# System Architecture

## Overview

The University Bus Tracking System is a modern, scalable web application built with a microservices architecture. The system provides real-time bus tracking, route management, and comprehensive administrative controls.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web App   │  │ Mobile App  │  │ Driver App  │  │ Admin Panel │        │
│  │  (React)    │  │  (React)    │  │  (React)    │  │  (React)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER / REVERSE PROXY                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Nginx                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Static Files  │  │   API Gateway   │  │  WebSocket      │              │
│  │   (Frontend)    │  │   (Backend)     │  │   Proxy         │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Internal Network
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        Backend API Server                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │   Routes    │  │  Services   │  │ Middleware  │  │  WebSocket  │    │ │
│  │  │             │  │             │  │             │  │   Server    │    │ │
│  │  │ • Auth      │  │ • Admin     │  │ • Auth      │  │             │    │ │
│  │  │ • Buses     │  │ • Location  │  │ • CORS      │  │ • Real-time │    │ │
│  │  │ • Routes    │  │ • Route     │  │ • Rate      │  │   updates   │    │ │
│  │  │ • Storage   │  │ • Storage   │  │   Limit     │  │ • Location  │    │ │
│  │  │ • Analytics │  │ • Analytics │  │ • Validation│  │   sharing   │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Database Connections
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        PostgreSQL Database                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │    Users    │  │    Buses    │  │   Routes    │  │ Live        │    │ │
│  │  │             │  │             │  │             │  │ Locations   │    │ │
│  │  │ • profiles  │  │ • bus_info  │  │ • route_data│  │             │    │ │
│  │  │ • auth      │  │ • capacity  │  │ • geometry  │  │ • real-time │    │ │
│  │  │ • roles     │  │ • status    │  │ • stops     │  │   tracking  │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        Supabase Services                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │   Storage   │  │   Auth      │  │ Real-time   │  │   Edge      │    │ │
│  │  │             │  │             │  │             │  │ Functions   │    │ │
│  │  │ • Files     │  │ • JWT       │  │ • Subscriptions│ • Custom    │    │ │
│  │  │ • Images    │  │ • Sessions  │  │ • Live data │   logic      │    │ │
│  │  │ • Documents │  │ • RLS       │  │ • Webhooks  │             │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ External APIs
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Maps API  │  │   Email     │  │   SMS       │  │   Analytics │        │
│  │  (Leaflet)  │  │  Service    │  │  Service    │  │   Service   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Client Layer

#### Web Application (React)
- **Technology**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Maps**: Leaflet with React-Leaflet
- **Real-time**: Socket.IO Client

**Key Features:**
- Responsive design for all devices
- Real-time bus tracking
- Interactive route visualization
- User authentication
- Role-based access control

#### Mobile Application
- **Technology**: React Native (planned)
- **Features**: GPS location sharing, offline support
- **Platforms**: iOS and Android

#### Driver Application
- **Technology**: React with PWA capabilities
- **Features**: Location sharing, route navigation, status updates
- **Offline Support**: Service workers for offline functionality

#### Admin Panel
- **Technology**: React with admin-specific components
- **Features**: Fleet management, analytics dashboard, user management
- **Access Control**: Admin-only features and data

### 2. Load Balancer / Reverse Proxy

#### Nginx Configuration
- **SSL Termination**: HTTPS to HTTP conversion
- **Static File Serving**: Frontend assets
- **API Gateway**: Backend API routing
- **WebSocket Proxy**: Real-time connection handling
- **Rate Limiting**: Request throttling
- **Caching**: Static asset optimization

**Configuration Features:**
- Gzip compression
- Security headers
- Load balancing (multiple backend instances)
- Health checks
- Logging and monitoring

### 3. Application Layer

#### Backend API Server (Node.js/Express)

**Core Components:**

##### Routes Module
```typescript
// Authentication routes
POST   /auth/login
POST   /auth/logout
GET    /auth/me

// Bus management routes
GET    /buses
POST   /buses
PUT    /buses/:id
DELETE /buses/:id

// Route management routes
GET    /routes
POST   /routes
PUT    /routes/:id
DELETE /routes/:id

// Location tracking routes
POST   /location/update
GET    /location/bus/:id
GET    /location/route/:id

// File management routes
POST   /storage/upload
GET    /storage/files
DELETE /storage/files/:path

// Analytics routes
GET    /analytics/overview
GET    /analytics/bus-usage
```

##### Services Module
```typescript
// AdminService
- Bus management (CRUD operations)
- User management
- Analytics and reporting
- System configuration

// LocationService
- Real-time location tracking
- ETA calculations
- Route optimization
- Geospatial queries

// RouteService
- Route planning and optimization
- Stop management
- Distance calculations
- Schedule management

// StorageService
- File upload and management
- Image processing
- Document storage
- CDN integration
```

##### Middleware Module
```typescript
// Authentication middleware
- JWT token validation
- Role-based access control
- Session management

// CORS middleware
- Cross-origin request handling
- Security headers
- Preflight request handling

// Rate limiting middleware
- Request throttling
- IP-based limiting
- Burst protection

// Validation middleware
- Input sanitization
- Schema validation
- Error handling
```

##### WebSocket Server
```typescript
// Real-time features
- Location updates broadcasting
- Bus status changes
- Route updates
- Driver notifications

// Connection management
- Authentication
- Room management
- Connection monitoring
- Error handling
```

### 4. Data Layer

#### PostgreSQL Database

**Core Tables:**

##### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'driver', 'student')),
  phone VARCHAR(20),
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

##### Buses Table
```sql
CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  number_plate VARCHAR(20) UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  model VARCHAR(100),
  year INTEGER,
  bus_image_url TEXT,
  assigned_driver_id UUID REFERENCES users(id),
  route_id UUID REFERENCES routes(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

##### Routes Table
```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  stops GEOMETRY(LINESTRING, 4326) NOT NULL,
  distance_km DECIMAL(10,2) NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

##### Live Locations Table
```sql
CREATE TABLE live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES buses(id) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  route_id UUID REFERENCES routes(id),
  eta_minutes INTEGER
);
```

#### Supabase Services

##### Storage Service
- **File Management**: Upload, download, delete
- **Image Processing**: Resize, compress, format conversion
- **CDN Integration**: Global content delivery
- **Access Control**: Row-level security policies

##### Authentication Service
- **JWT Management**: Token generation and validation
- **Session Management**: User session tracking
- **Role-based Access**: Permission management
- **Security Features**: Password hashing, rate limiting

##### Real-time Service
- **Live Subscriptions**: Database change notifications
- **WebSocket Integration**: Real-time data streaming
- **Event Broadcasting**: System-wide notifications
- **Connection Management**: Client connection handling

##### Edge Functions
- **Custom Logic**: Serverless function execution
- **API Extensions**: Additional endpoint functionality
- **Data Processing**: Real-time data transformation
- **Integration**: Third-party service connections

### 5. External Services

#### Maps API (Leaflet)
- **Interactive Maps**: Real-time map rendering
- **Geospatial Operations**: Distance calculations, route optimization
- **Tile Management**: Map tile loading and caching
- **Custom Markers**: Bus location indicators

#### Email Service
- **Notifications**: System alerts and updates
- **User Communication**: Password resets, confirmations
- **Reports**: Automated report delivery
- **Marketing**: Promotional communications

#### SMS Service
- **Emergency Alerts**: Critical system notifications
- **Driver Updates**: Route changes and instructions
- **User Notifications**: Important updates and reminders
- **Verification**: Two-factor authentication

#### Analytics Service
- **Usage Tracking**: User behavior analysis
- **Performance Monitoring**: System performance metrics
- **Business Intelligence**: Operational insights
- **Reporting**: Automated report generation

## Data Flow

### 1. User Authentication Flow
```
1. User submits login credentials
2. Frontend sends request to /auth/login
3. Backend validates credentials against database
4. JWT token generated and returned
5. Frontend stores token in secure storage
6. Subsequent requests include token in Authorization header
```

### 2. Real-time Location Update Flow
```
1. Driver app captures GPS location
2. Location data sent to /location/update endpoint
3. Backend validates and stores location in database
4. WebSocket server broadcasts update to all connected clients
5. Frontend applications receive real-time updates
6. Map components update bus positions
```

### 3. File Upload Flow
```
1. User selects file for upload
2. Frontend sends file to /storage/upload endpoint
3. Backend validates file type and size
4. File uploaded to Supabase Storage
5. Public URL generated and returned
6. File URL stored in database
7. Frontend displays uploaded file
```

### 4. Route Management Flow
```
1. Admin creates new route in admin panel
2. Route data sent to /routes endpoint
3. Backend validates route geometry and data
4. Route stored in PostgreSQL with PostGIS
5. Route available for bus assignment
6. Real-time updates sent to all clients
```

## Security Architecture

### 1. Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Role-based Access**: Admin, driver, student permissions
- **Session Management**: Secure session handling
- **Password Security**: Bcrypt hashing with salt

### 2. Data Protection
- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers

### 3. Network Security
- **HTTPS Enforcement**: SSL/TLS encryption
- **CORS Configuration**: Cross-origin request control
- **Rate Limiting**: Request throttling and abuse prevention
- **Firewall Rules**: Network-level access control

### 4. Infrastructure Security
- **Environment Variables**: Secure configuration management
- **Secret Management**: Encrypted credential storage
- **Regular Updates**: Security patch management
- **Monitoring**: Security event logging and alerting

## Scalability Considerations

### 1. Horizontal Scaling
- **Load Balancing**: Multiple backend instances
- **Database Sharding**: Geographic data distribution
- **CDN Integration**: Global content delivery
- **Microservices**: Service decomposition

### 2. Performance Optimization
- **Database Indexing**: Optimized query performance
- **Caching Strategy**: Redis for session and data caching
- **Connection Pooling**: Database connection optimization
- **Asset Optimization**: Minification and compression

### 3. Monitoring & Observability
- **Application Monitoring**: PM2 process management
- **Database Monitoring**: PostgreSQL performance tracking
- **Infrastructure Monitoring**: Server resource monitoring
- **Error Tracking**: Comprehensive error logging

### 4. Backup & Recovery
- **Automated Backups**: Daily database backups
- **Disaster Recovery**: Multi-region data replication
- **Data Retention**: Configurable backup retention
- **Recovery Procedures**: Documented recovery processes

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Maps**: Leaflet with React-Leaflet
- **State Management**: React Context + Hooks
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+ with PostGIS
- **ORM**: Native PostgreSQL client
- **Real-time**: Socket.IO
- **Authentication**: JWT with Supabase Auth

### Infrastructure
- **Web Server**: Nginx
- **Process Manager**: PM2
- **Containerization**: Docker (optional)
- **Cloud Platform**: Supabase
- **Storage**: Supabase Storage
- **SSL**: Let's Encrypt

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint + Prettier
- **Testing**: Jest (planned)
- **Version Control**: Git
- **CI/CD**: GitHub Actions (planned)

## Deployment Architecture

### Development Environment
- **Local Development**: Docker Compose
- **Hot Reloading**: Vite dev server
- **Database**: Local PostgreSQL instance
- **Environment**: Development configuration

### Staging Environment
- **Server**: Dedicated staging server
- **Database**: Staging PostgreSQL instance
- **Process Management**: PM2
- **Monitoring**: Basic logging and monitoring

### Production Environment
- **Load Balancer**: Nginx with SSL termination
- **Application Servers**: Multiple Node.js instances
- **Database**: Production PostgreSQL with replication
- **Monitoring**: Comprehensive monitoring and alerting
- **Backup**: Automated backup and recovery
- **Security**: Firewall, fail2ban, SSL certificates

This architecture provides a robust, scalable, and secure foundation for the University Bus Tracking System, supporting real-time operations, high availability, and future growth requirements.

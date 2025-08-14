# University Bus Tracking System - System Overview Flowchart

## System Architecture Overview

```mermaid
graph TD
    %% External Entities %%
    student[Student/Faculty User]
    driver[Bus Driver]
    admin[Admin User]
    
    %% Frontend Components %%
    webapp[Web Application<br/>React + TypeScript + Tailwind]
    maplibre[Map Rendering<br/>MapLibre GL JS]
    osm[OpenStreetMap<br/>Map Tiles]
    
    %% Backend Components %%
    backend[Backend Server<br/>Node.js + Express]
    websocket[WebSocket Server<br/>Real-time Communication]
    
    %% Authentication %%
    supabase_auth[Supabase Auth<br/>User Authentication]
    
    %% Storage %%
    supabase_storage[Supabase Storage<br/>File/Image Storage]
    
    %% Database %%
    postgres[PostgreSQL Database<br/>Data Storage]
    postgis[PostGIS Extension<br/>Geospatial Processing]
    
    %% Data Stores %%
    user_data[(User Data<br/>Students, Drivers, Admins)]
    bus_data[(Bus Data<br/>Vehicles, Locations)]
    route_data[(Route Data<br/>Paths, Stops)]
    file_data[(File Storage<br/>Images, Documents)]
    
    %% Connections %%
    student --- webapp
    driver --- webapp
    admin --- webapp
    
    webapp --- maplibre
    maplibre --- osm
    
    webapp --- backend
    backend --- websocket
    backend --- supabase_auth
    backend --- postgres
    postgres --- postgis
    
    backend --- supabase_storage
    
    supabase_auth --- user_data
    postgres --- bus_data
    postgres --- route_data
    supabase_storage --- file_data
```

## Student User Flow

```mermaid
flowchart TD
    S1[Student Login] --> S2[Authenticate with Supabase Auth]
    S2 --> S3[Access Bus Tracking Dashboard]
    S3 --> S4[View Available Buses on Map]
    S4 --> S5[Select Specific Bus]
    S5 --> S6[View Real-time Location Updates<br/>via WebSocket Streaming]
    S6 --> S7[View Estimated Time of Arrival<br/>Calculated by PostGIS]
    S7 --> S8[View Bus Route Information]
```

## Driver Flow

```mermaid
flowchart TD
    D1[Driver Login] --> D2[Authenticate with Supabase Auth]
    D2 --> D3[Access Driver Panel]
    D3 --> D4[Start Driving Session]
    D4 --> D5[Send GPS Location<br/>from Mobile Device<br/>via WebSocket]
    D5 --> D6[Receive Admin Messages<br/>via WebSocket]
    D6 --> D7[End Driving Session]
```

## Admin Flow

```mermaid
flowchart TD
    A1[Admin Login] --> A2[Authenticate with Supabase Auth]
    A2 --> A3[Access Admin Dashboard]
    A3 --> A4[Manage Buses<br/>Add/Edit/Remove<br/>Stored in PostgreSQL]
    A3 --> A5[Manage Drivers<br/>Add/Edit/Remove<br/>Auth via Supabase]
    A3 --> A6[Manage Routes<br/>Create/Edit/Delete<br/>Processed with PostGIS]
    A3 --> A7[Monitor Real-time Locations<br/>View All Buses on Map<br/>via WebSocket Streaming]
    A3 --> A8[Upload Bus/Diver Files<br/>Supabase Storage]
```

## Detailed System Components

### Core Technologies
- **Frontend**: React with TypeScript and Tailwind CSS
- **Mapping**: MapLibre GL JS with OpenStreetMap tiles
- **Backend**: Node.js with Express framework
- **Real-time Communication**: WebSocket streaming
- **Authentication**: Supabase Auth (email/password)
- **Database**: PostgreSQL with PostGIS extension
- **Storage**: Supabase Storage

### Data Flow Overview

```mermaid
flowchart LR
    subgraph "Frontend Layer"
        FE[React Web App<br/>Student/Diver/Admin Views]
        MAP[MapLibre GL JS<br/>OpenStreetMap Rendering]
    end
    
    subgraph "Communication Layer"
        REST[REST API Calls]
        WS[WebSocket Streaming]
    end
    
    subgraph "Backend Layer"
        AUTH[Supabase Auth<br/>User Management]
        API[Express Server<br/>Business Logic]
        WS_SERVER[WebSocket Server<br/>Real-time Updates]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL + PostGIS<br/>Structured Data<br/>Spatial Processing)]
        STORAGE[(Supabase Storage<br/>File Storage)]
    end
    
    FE <--> |User Interactions| REST
    FE <--> |Location Updates<br/>Real-time Data| WS
    MAP <--> |Map Requests| OSM[OpenStreetMap<br/>Map Tiles]
    
    REST <--> API
    WS <--> WS_SERVER
    
    API <--> AUTH
    API <--> DB
    API <--> STORAGE
    WS_SERVER <--> DB
```

### Key Processes and Data Stores

| Component | Function | Technology |
|-----------|----------|------------|
| **User Authentication** | Handle login/logout for all user types | Supabase Auth |
| **Real-time Tracking** | Stream location updates from drivers to students | WebSocket |
| **Map Rendering** | Display buses, routes, and locations | MapLibre + OSM |
| **Route Calculation** | Calculate ETAs and optimal paths | PostGIS |
| **Data Storage** | Store buses, drivers, routes, and user info | PostgreSQL |
| **File Storage** | Store images and documents | Supabase Storage |

### Data Stores

1. **User Data Store** - Contains student, driver, and admin information (Supabase Auth)
2. **Bus Data Store** - Contains vehicle information and real-time locations (PostgreSQL)
3. **Route Data Store** - Contains route paths, stops, and scheduling (PostgreSQL + PostGIS)
4. **File Storage** - Contains images and documents (Supabase Storage)
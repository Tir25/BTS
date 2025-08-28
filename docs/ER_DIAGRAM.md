# 🗄️ Bus Tracking System - Entity-Relationship (E-R) Diagram

## 📋 **DATABASE OVERVIEW**

This document provides a comprehensive Entity-Relationship (E-R) Diagram for the Ganpat University Bus Tracking System database, covering all entities, attributes, relationships, and data flow patterns.

---

## 🎯 **MAIN ENTITY-RELATIONSHIP DIAGRAM**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GANPAT UNIVERSITY BUS TRACKING SYSTEM                 │
│                              ENTITY-RELATIONSHIP DIAGRAM                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER MANAGEMENT ENTITIES                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    USERS    │    │   PROFILES  │    │USER_PROFILES│    │   DRIVERS   │
├─────────────┤    ├─────────────┤    ├─────────────┤    ├─────────────┤
│ PK: id      │◄──►│ PK: id      │    │ PK: user_id │    │ PK: id      │
│ email       │    │ full_name   │    │ full_name   │    │ driver_name │
│ role        │    │ role        │    │ role        │    │ license_no  │
│ first_name  │    │ created_at  │    │ avatar_url  │    │ phone       │
│ last_name   │    │ updated_at  │    │ created_at  │    │ email       │
│ phone       │    │ email       │    └─────────────┘    │ photo_url   │
│ created_at  │    │ driver_id   │                       │ created_at  │
│ updated_at  │    └─────────────┘                       └─────────────┘
│ profile_photo│
└─────────────┘
       │
       │ 1:1
       ▼
┌─────────────┐
│   PROFILES  │
└─────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TRANSPORTATION ENTITIES                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    ROUTES   │    │    BUSES    │    │DRIVER_BUS_  │
├─────────────┤    ├─────────────┤    │ASSIGNMENTS  │
│ PK: id      │◄───┤ PK: id      │◄───┤ PK: id      │
│ name        │    │ code        │    │ driver_id   │
│ description │    │ name        │    │ bus_id      │
│ geom        │    │ route_id    │    │ route_id    │
│ total_distance│  │ driver_id   │    │ is_active   │
│ map_image_url│   │ photo_url   │    │ assigned_at │
│ is_active   │    │ is_active   │    │ created_at  │
│ updated_at  │    │ updated_at  │    │ updated_at  │
│ stops       │    │ assigned_driver_id│
│ distance_km │    │ bus_image_url│
│ estimated_duration│ number_plate│
│ route_map_url│   │ capacity    │
│ created_at  │    │ model       │
│ origin      │    │ year        │
│ destination │    │ created_at  │
│ destination_coordinates│
│ use_custom_arrival│
│ custom_arrival_point│
│ custom_arrival_coordinates│
│ use_custom_starting_point│
│ custom_starting_point│
│ custom_starting_coordinates│
│ arrival_point_type│
│ starting_point_type│
│ use_custom_origin│
│ custom_origin_point│
│ custom_origin_coordinates│
│ origin_point_type│
│ city        │
│ custom_destination│
│ custom_destination_coordinates│
│ custom_origin│
│ bus_stops   │
│ last_eta_calculation│
│ current_eta_minutes│
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │ 1:N               │ 1:N               │ 1:1
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ ROUTE_STOPS │    │BUS_LOCATIONS│    │   DRIVERS   │
├─────────────┤    │   _LIVE     │    └─────────────┘
│ PK: id      │    ├─────────────┤
│ route_id    │    │ PK: bus_id  │
│ name        │    │ geom        │
│ geom        │    │ lat         │
│ seq         │    │ lng         │
└─────────────┘    │ speed_kmh   │
                   │ heading     │
                   │ accuracy_m  │
                   │ updated_at  │
                   └─────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LOCATION TRACKING ENTITIES                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ LIVE_LOCATIONS│  │BUS_LOCATION │    │  BUS_STOPS  │
├─────────────┤    │  _HISTORY   │    ├─────────────┤
│ PK: id      │    ├─────────────┤    │ PK: id      │
│ bus_id      │    │ PK: id      │    │ route_id    │
│ location    │    │ bus_id      │    │ name        │
│ speed_kmh   │    │ geom        │    │ description │
│ heading_degrees│ │ speed_kmh   │    │ location    │
│ recorded_at │    │ heading     │    │ stop_order  │
└─────────────┘    │ recorded_at │    │ estimated_time_from_start│
                   └─────────────┘    │ is_active   │
                                      │ created_at  │
                                      │ updated_at  │
                                      └─────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DESTINATION ENTITIES                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│DESTINATIONS │    │DEFAULT_DEST │    │DEFAULT_DEST │
├─────────────┤    │ INATIONS    │    │ INATION     │
│ PK: id      │    ├─────────────┤    ├─────────────┤
│ name        │    │ PK: id      │    │ PK: id      │
│ address     │    │ name        │    │ name        │
│ latitude    │    │ description │    │ description │
│ longitude   │    │ location    │    │ location    │
│ location    │    │ address     │    │ address     │
│ is_default  │    │ is_active   │    │ is_active   │
│ is_active   │    │ created_at  │    │ created_at  │
│ created_at  │    │ updated_at  │    │ updated_at  │
│ updated_at  │    └─────────────┘    └─────────────┘
└─────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ENTITIES                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│SYSTEM_CONSTANTS│
├─────────────┤
│ PK: id      │
│ constant_name│
│ constant_value│
│ description │
│ created_at  │
│ updated_at  │
└─────────────┘
```

---

## 🔗 **RELATIONSHIP MAPPING**

### **Primary Relationships**

| **Entity A** | **Relationship** | **Entity B** | **Cardinality** | **Description** |
|--------------|------------------|--------------|------------------|-----------------|
| `users` | **1:1** | `profiles` | One-to-One | User authentication to profile mapping |
| `users` | **1:1** | `user_profiles` | One-to-One | Extended user profile information |
| `profiles` | **1:1** | `drivers` | One-to-One | Profile to driver information mapping |
| `routes` | **1:N** | `buses` | One-to-Many | Route can have multiple buses |
| `routes` | **1:N** | `route_stops` | One-to-Many | Route contains multiple stops |
| `routes` | **1:N** | `bus_stops` | One-to-Many | Route has multiple bus stops |
| `buses` | **1:1** | `driver_bus_assignments` | One-to-One | Bus to driver assignment |
| `buses` | **1:N** | `live_locations` | One-to-Many | Bus has multiple location updates |
| `buses` | **1:N** | `bus_locations_live` | One-to-Many | Real-time bus location tracking |
| `buses` | **1:N** | `bus_location_history` | One-to-Many | Historical bus location data |
| `drivers` | **1:N** | `driver_bus_assignments` | One-to-Many | Driver can be assigned to multiple buses |
| `destinations` | **1:1** | `default_destination` | One-to-One | Default destination mapping |
| `destinations` | **1:1** | `default_destinations` | One-to-One | Multiple default destinations |

### **Foreign Key Relationships**

| **Child Table** | **Foreign Key** | **Parent Table** | **Referenced Column** |
|-----------------|-----------------|------------------|----------------------|
| `profiles` | `driver_id` | `drivers` | `id` |
| `buses` | `route_id` | `routes` | `id` |
| `buses` | `driver_id` | `drivers` | `id` |
| `buses` | `assigned_driver_id` | `drivers` | `id` |
| `route_stops` | `route_id` | `routes` | `id` |
| `bus_stops` | `route_id` | `routes` | `id` |
| `driver_bus_assignments` | `driver_id` | `drivers` | `id` |
| `driver_bus_assignments` | `bus_id` | `buses` | `id` |
| `driver_bus_assignments` | `route_id` | `routes` | `id` |
| `live_locations` | `bus_id` | `buses` | `id` |
| `bus_locations_live` | `bus_id` | `buses` | `id` |
| `bus_location_history` | `bus_id` | `buses` | `id` |

---

## 📊 **ENTITY DETAILED ANALYSIS**

### **1. 🧑‍💼 USER MANAGEMENT ENTITIES**

#### **`users` Entity**
- **Primary Key**: id (UUID)
- **Key Attributes**: email, role, first_name, last_name, phone
- **Relationships**: 1:1 with profiles, 1:1 with user_profiles, 1:N with drivers

#### **`profiles` Entity**
- **Primary Key**: id (UUID)
- **Key Attributes**: full_name, role, email, driver_id
- **Relationships**: 1:1 with users, 1:1 with drivers

#### **`drivers` Entity**
- **Primary Key**: id (UUID)
- **Key Attributes**: driver_name, license_no, phone, email, photo_url
- **Relationships**: 1:1 with profiles, 1:N with buses, 1:N with driver_bus_assignments

### **2. 🚌 TRANSPORTATION ENTITIES**

#### **`routes` Entity**
- **Primary Key**: id (UUID)
- **Key Attributes**: name, description, geom (PostGIS), distance_km, estimated_duration_minutes
- **Special Features**: Custom origin/destination points, ETA calculation, route geometry
- **Relationships**: 1:N with buses, route_stops, bus_stops, driver_bus_assignments

#### **`buses` Entity**
- **Primary Key**: id (UUID)
- **Key Attributes**: code, name, route_id, driver_id, number_plate, capacity, model, year
- **Relationships**: N:1 with routes, N:1 with drivers, 1:N with location tables

### **3. 📍 LOCATION TRACKING ENTITIES**

#### **`live_locations` Entity**
- **Primary Key**: id (UUID)
- **Key Attributes**: bus_id, location (PostGIS Point), speed_kmh, heading_degrees
- **Purpose**: Real-time location tracking for active buses
- **Data Volume**: 2,395 active records

#### **`bus_locations_live` Entity**
- **Primary Key**: bus_id (UUID)
- **Key Attributes**: geom, lat, lng, speed_kmh, heading, accuracy_m
- **Purpose**: Performance-optimized real-time location cache

### **4. 🎯 DESTINATION ENTITIES**

#### **`destinations` Entity**
- **Primary Key**: id (UUID)
- **Key Attributes**: name, address, latitude, longitude, location (PostGIS Point)
- **Purpose**: Destination management with geographic coordinates

---

## 🔄 **DATA FLOW PATTERNS**

### **1. 🚌 Real-Time Location Tracking Flow**
```
DRIVER INTERFACE → BUS → LIVE_LOCATIONS → BUS_LOCATIONS_LIVE → STUDENT MAP UPDATE
```

### **2. 👥 User Authentication Flow**
```
USERS → PROFILES → DRIVERS → DRIVER_BUS_ASSIGNMENTS → ROUTE ASSIGNMENT
```

### **3. 🛣️ Route Management Flow**
```
ROUTES → ROUTE_STOPS → BUS_STOPS → DESTINATIONS → ETA CALCULATION
```

---

## 📈 **DATABASE STATISTICS**

### **Current Data Volume**

| **Entity** | **Row Count** | **Status** | **Data Type** |
|------------|---------------|------------|---------------|
| `live_locations` | 2,395 | ACTIVE | Real-time tracking data |
| `profiles` | 5 | ACTIVE | User profiles |
| `users` | 5 | ACTIVE | User accounts |
| `user_profiles` | 4 | ACTIVE | Extended profiles |
| `buses` | 3 | ACTIVE | Bus fleet |
| `routes` | 3 | ACTIVE | Route definitions |
| `default_destination` | 1 | ACTIVE | Default destinations |
| `drivers` | 1 | ACTIVE | Driver information |
| `system_constants` | 1 | ACTIVE | System configuration |

### **Data Distribution Analysis**
- **Active Data**: 9 entities with real data
- **Empty Tables**: 7 entities (development artifacts)
- **Primary Data**: `live_locations` (2,395 rows) - Real-time tracking
- **User Data**: 5 active users with profiles
- **Fleet Data**: 3 buses and 3 routes configured

---

## 🔧 **TECHNICAL ARCHITECTURE**

### **Database Technologies**
- **Primary Database**: PostgreSQL 16
- **Spatial Extension**: PostGIS (for geographic data)
- **Authentication**: Supabase Auth (GoTrue)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for files and images

### **Data Types Used**
| **Category** | **Data Types** | **Usage** |
|--------------|----------------|-----------|
| **Identifiers** | UUID, INTEGER | Primary keys, foreign keys |
| **Text Data** | TEXT, VARCHAR, CHARACTER VARYING | Names, descriptions, URLs |
| **Geographic** | GEOMETRY (PostGIS), NUMERIC | GPS coordinates, routes, stops |
| **Temporal** | TIMESTAMP, TIMESTAMPTZ | Creation dates, update times |
| **Boolean** | BOOLEAN | Status flags, active states |
| **JSON** | JSONB | Complex data structures |
| **Numeric** | NUMERIC, DOUBLE PRECISION, INTEGER | Measurements, counts, IDs |

### **Performance Optimizations**
1. **Spatial Indexing**: PostGIS spatial indexes on geometry columns
2. **Real-time Caching**: `bus_locations_live` table for performance
3. **Historical Archiving**: `bus_location_history` for analytics
4. **JSON Storage**: Complex data in JSONB for flexibility
5. **UUID Primary Keys**: Distributed ID generation

---

## 🎯 **PRESENTATION NOTES**

### **Key Database Features to Highlight:**
1. **Spatial Database Design** - Advanced PostGIS integration for geographic data
2. **Real-time Architecture** - Live location tracking with WebSocket support
3. **Scalable User Management** - Multi-role authentication system
4. **Flexible Route System** - Custom origin/destination points
5. **Performance Optimization** - Caching and indexing strategies
6. **Data Integrity** - Foreign key constraints and validation

### **Technical Achievements:**
1. **Geospatial Integration** - PostGIS for advanced mapping capabilities
2. **Real-time Data Flow** - Live location updates and broadcasting
3. **Multi-tenant Architecture** - Role-based access control
4. **Performance Optimization** - Caching layers and efficient queries
5. **Data Consistency** - Proper normalization and relationships

### **Business Value:**
1. **Real-time Tracking** - Live bus location monitoring
2. **Route Optimization** - Efficient route planning and management
3. **User Experience** - Accurate ETAs and live updates
4. **Operational Efficiency** - Automated fleet management
5. **Data Analytics** - Historical data for insights and optimization

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Database Status**: Production Ready with 2,395+ location records

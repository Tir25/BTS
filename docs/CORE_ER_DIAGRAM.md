# ER DIAGRAM OF A BUS TRACKING SYSTEM

This document provides an Entity-Relationship (ER) diagram for the core tables of the University Bus Tracking System, illustrating the main entities, their attributes, and relationships.

---

## CORE ENTITIES

The ER diagram focuses on the five core entities that form the foundation of the system:

1. **USER_PROFILES** - All users (admins, drivers, students)
2. **BUSES** - Physical bus fleet
3. **ROUTES** - Bus route definitions
4. **LIVE_LOCATIONS** - Real-time GPS location tracking (Weak Entity)
5. **DRIVER_BUS_ASSIGNMENTS** - Assignment relationship entity

---

## ENTITY-RELATIONSHIP DIAGRAM

```
                    ER DIAGRAM OF A BUS TRACKING SYSTEM
                      
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                        ┌─────────────┐                                   │
│                        │ USER_PROFILES│                                   │
│                        └──────┬──────┘                                   │
│                               │                                            │
│         ┌─────────────────────┼─────────────────────┐                    │
│         │                     │                     │                    │
│         ▼                     ▼                     ▼                    │
│    ┌────────┐          ┌──────────┐          ┌─────────────┐           │
│    │ Id     │          │ Email    │          │ Full_Name   │           │
│    │ (PK)   │          │          │          │             │           │
│    └────────┘          └──────────┘          └─────────────┘           │
│                                                                          │
│         ┌────────┐          ┌──────────┐          ┌─────────────┐      │
│         │ Role   │          │ Phone    │          │ License_No  │      │
│         └────────┘          └──────────┘          └─────────────┘      │
│                                                                          │
│                                                                          │
│                        ┌─────────────┐                                   │
│                        │    BUSES    │                                   │
│                        └──────┬──────┘                                   │
│                               │                                            │
│         ┌─────────────────────┼─────────────────────┐                    │
│         │                     │                     │                    │
│         ▼                     ▼                     ▼                    │
│    ┌────────┐          ┌──────────┐          ┌─────────────┐           │
│    │ Id     │          │Bus_Number│          │ Capacity    │           │
│    │ (PK)   │          │          │          │             │           │
│    └────────┘          └──────────┘          └─────────────┘           │
│                                                                          │
│         ┌────────┐          ┌──────────┐          ┌─────────────┐      │
│         │ Model  │          │ Vehicle_ │          │ Year        │      │
│         │        │          │    No    │          │             │      │
│         └────────┘          └──────────┘          └─────────────┘      │
│                                                                          │
│                                                                          │
│                        ┌─────────────┐                                   │
│                        │   ROUTES    │                                   │
│                        └──────┬──────┘                                   │
│                               │                                            │
│         ┌─────────────────────┼─────────────────────┐                    │
│         │                     │                     │                    │
│         ▼                     ▼                     ▼                    │
│    ┌────────┐          ┌──────────┐          ┌─────────────┐           │
│    │ Id     │          │  Name    │          │  Origin     │           │
│    │ (PK)   │          │          │          │             │           │
│    └────────┘          └──────────┘          └─────────────┘           │
│                                                                          │
│         ┌────────┐          ┌──────────┐          ┌─────────────┐      │
│         │Destination│        │Distance_ │          │ Estimated_  │      │
│         │          │        │   km     │          │ Duration    │      │
│         └────────┘          └──────────┘          └─────────────┘      │
│                                                                          │
│                                                                          │
│                    ┌────────────────────────┐                           │
│                    │  DRIVER_BUS_ASSIGNMENTS│                           │
│                    └────────┬───────┬───────┘                           │
│                             │       │                                    │
│                    ┌────────┴───┐  ┌┴──────────┐                        │
│                    │ Assigned_At│  │ Is_Active │                        │
│                    └────────────┘  └───────────┘                        │
│                                                                          │
│                                                                          │
│                    ╔════════════════════════╗                           │
│                    ║  LIVE_LOCATIONS        ║                           │
│                    ║   (Weak Entity)        ║                           │
│                    ╚═════┬══════════════════╝                           │
│                          │                                                │
│              ┌───────────┼───────────┐                                  │
│              │           │           │                                  │
│              ▼           ▼           ▼                                  │
│         ┌────────┐  ┌──────────┐  ┌─────────────┐                     │
│         │ Location│  │Speed_kmh │  │Heading_     │                     │
│         │ (PK)   │  │          │  │ Degrees     │                     │
│         └────────┘  └──────────┘  └─────────────┘                     │
│                                                                          │
│              ┌───────────┐                                             │
│              │Recorded_At│                                             │
│              └───────────┘                                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


                    RELATIONSHIPS

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────┐          ╔═══════╗          ┌──────────────┐       │
│  │USER_PROFILES │◄─────────║ Drives║─────────►│    BUSES     │       │
│  └──────────────┘          ╚═══╤═══╝          └──────────────┘       │
│                                 │                                      │
│                            ┌────┴─────┐                               │
│                            │Assigned_ │                               │
│                            │   At     │                               │
│                            └──────────┘                               │
│                                                                         │
│  ┌──────────────┐          ╔═══════╗          ┌──────────────┐       │
│  │USER_PROFILES │◄─────────║Assigns║─────────►│   ROUTES     │       │
│  └──────────────┘          ╚═══╤═══╝          └──────────────┘       │
│                                 │                                      │
│                            ┌────┴─────┐                               │
│                            │Assigned_ │                               │
│                            │   At     │                               │
│                            └──────────┘                               │
│                                                                         │
│  ┌──────────────┐          ╔═══════╗          ┌──────────────┐       │
│  │    BUSES     │◄─────────║ Serves║─────────►│   ROUTES     │       │
│  └──────────────┘          ╚═══╤═══╝          └──────────────┘       │
│                                 │                                      │
│                            ┌────┴─────┐                               │
│                            │Is_Active │                               │
│                            └──────────┘                               │
│                                                                         │
│  ┌──────────────┐          ╔═══════════╗        ╔══════════════════╗ │
│  │    BUSES     │◄─────────║   Tracks  ║────────║ LIVE_LOCATIONS   ║ │
│  └──────────────┘          ╚═══╤═══════╝        ║  (Weak Entity)   ║ │
│                                 │                 ╚══════════════════╝ │
│                            ┌────┴─────┐                               │
│                            │ Recorded │                               │
│                            │    At    │                               │
│                            └──────────┘                               │
│                                                                         │
│  ┌──────────────┐          ╔═══════════╗        ╔══════════════════╗ │
│  │USER_PROFILES │◄─────────║ Reports   ║────────║ LIVE_LOCATIONS   ║ │
│  │ (Drivers)    │          ╚═══╤═══════╝        ║  (Weak Entity)   ║ │
│  └──────────────┘              │                 ╚══════════════════╝ │
│                            ┌────┴─────┐                               │
│                            │ Recorded │                               │
│                            │    At    │                               │
│                            └──────────┘                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## DETAILED ENTITY DESCRIPTIONS

### 1. USER_PROFILES Entity
**Purpose**: Stores all user identities including admins, drivers, and students.

**Primary Key**: `Id` (UUID)

**Attributes**:
- `Id` (Primary Key) - Unique identifier
- `Email` - User's email address (Unique)
- `Full_Name` - User's complete name
- `Role` - User role (admin, driver, student)
- `Phone` - Contact phone number
- `License_No` - Driver's license number (for drivers only)
- `Created_At` - Account creation timestamp

**Relationships**:
- **Drives**: Many-to-Many with BUSES (via DRIVER_BUS_ASSIGNMENTS)
- **Assigns**: Many-to-Many with ROUTES (via DRIVER_BUS_ASSIGNMENTS)
- **Reports**: One-to-Many with LIVE_LOCATIONS

---

### 2. BUSES Entity
**Purpose**: Represents each physical bus in the fleet.

**Primary Key**: `Id` (UUID)

**Attributes**:
- `Id` (Primary Key) - Unique identifier
- `Bus_Number` - Bus identification number (Unique)
- `Vehicle_No` - Vehicle registration number (Unique)
- `Capacity` - Number of seats
- `Model` - Bus model/make
- `Year` - Manufacturing year
- `Created_At` - Bus registration timestamp

**Relationships**:
- **Drives**: Many-to-Many with USER_PROFILES (via DRIVER_BUS_ASSIGNMENTS)
- **Serves**: Many-to-Many with ROUTES (via DRIVER_BUS_ASSIGNMENTS)
- **Tracks**: One-to-Many with LIVE_LOCATIONS

---

### 3. ROUTES Entity
**Purpose**: Defines bus routes with origin, destination, and path information.

**Primary Key**: `Id` (UUID)

**Attributes**:
- `Id` (Primary Key) - Unique identifier
- `Name` - Route name (Unique)
- `Origin` - Starting point of the route
- `Destination` - End point of the route
- `Distance_km` - Total route distance in kilometers
- `Estimated_Duration` - Expected travel time in minutes
- `Created_At` - Route creation timestamp

**Relationships**:
- **Assigns**: Many-to-Many with USER_PROFILES (via DRIVER_BUS_ASSIGNMENTS)
- **Serves**: Many-to-Many with BUSES (via DRIVER_BUS_ASSIGNMENTS)

---

### 4. DRIVER_BUS_ASSIGNMENTS Entity
**Purpose**: Tracks assignments of drivers to buses and routes over time.

**Attributes**:
- `Assigned_At` - Timestamp when assignment was made
- `Is_Active` - Whether the assignment is currently active

**Relationships**:
- Connects USER_PROFILES, BUSES, and ROUTES in a many-to-many relationship

---

### 5. LIVE_LOCATIONS Entity (Weak Entity)
**Purpose**: Stores real-time GPS location data for buses. This is a weak entity because its existence depends on BUSES and USER_PROFILES (drivers).

**Partial Key**: `Id` (UUID)

**Attributes**:
- `Id` (Partial Key) - Unique identifier for location record
- `Location` - GPS coordinates (PostGIS Point: longitude, latitude)
- `Speed_kmh` - Current speed in kilometers per hour
- `Heading_Degrees` - Direction of travel in degrees (0-360)
- `Recorded_At` - Timestamp when location was recorded

**Identifying Relationships**:
- **Tracks**: Identifying relationship with BUSES (double diamond)
- **Reports**: Identifying relationship with USER_PROFILES/Drivers (double diamond)

**Constraints**:
- Total participation: Every LIVE_LOCATIONS record must be associated with a BUS and a DRIVER
- A bus can have multiple location records (one-to-many)

---

## RELATIONSHIP DESCRIPTIONS

### 1. Drives Relationship
- **Type**: Many-to-Many
- **Participants**: USER_PROFILES (Drivers) ↔ BUSES
- **Via**: DRIVER_BUS_ASSIGNMENTS
- **Attributes**: `Assigned_At` - When the driver was assigned to the bus

### 2. Assigns Relationship
- **Type**: Many-to-Many
- **Participants**: USER_PROFILES (Drivers) ↔ ROUTES
- **Via**: DRIVER_BUS_ASSIGNMENTS
- **Attributes**: `Assigned_At` - When the driver was assigned to the route

### 3. Serves Relationship
- **Type**: Many-to-Many
- **Participants**: BUSES ↔ ROUTES
- **Via**: DRIVER_BUS_ASSIGNMENTS
- **Attributes**: `Is_Active` - Whether the bus is currently serving this route

### 4. Tracks Relationship (Identifying)
- **Type**: One-to-Many (Total Participation on LIVE_LOCATIONS)
- **Participants**: BUSES → LIVE_LOCATIONS
- **Attributes**: `Recorded_At` - When the location was tracked
- **Note**: Double line indicates total participation - every location must belong to a bus

### 5. Reports Relationship (Identifying)
- **Type**: One-to-Many (Total Participation on LIVE_LOCATIONS)
- **Participants**: USER_PROFILES (Drivers) → LIVE_LOCATIONS
- **Attributes**: `Recorded_At` - When the driver reported the location
- **Note**: Double line indicates total participation - every location must be reported by a driver

---

## CARDINALITY RATIOS

| Relationship | Entity 1 | Cardinality | Relationship Name | Cardinality | Entity 2 |
|--------------|----------|-------------|-------------------|-------------|----------|
| Drives | USER_PROFILES | N | Drives | N | BUSES |
| Assigns | USER_PROFILES | N | Assigns | N | ROUTES |
| Serves | BUSES | N | Serves | N | ROUTES |
| Tracks | BUSES | 1 | Tracks | N | LIVE_LOCATIONS |
| Reports | USER_PROFILES | 1 | Reports | N | LIVE_LOCATIONS |

---

## KEY CONSTRAINTS

1. **Primary Keys**:
   - USER_PROFILES: `Id`
   - BUSES: `Id`
   - ROUTES: `Id`
   - LIVE_LOCATIONS: `Id` (partial key, depends on parent entities)

2. **Unique Constraints**:
   - USER_PROFILES: `Email` must be unique
   - BUSES: `Bus_Number` and `Vehicle_No` must be unique
   - ROUTES: `Name` must be unique

3. **Foreign Key Constraints**:
   - LIVE_LOCATIONS depends on BUSES (`bus_id`) and USER_PROFILES (`driver_id`)
   - DRIVER_BUS_ASSIGNMENTS references USER_PROFILES, BUSES, and ROUTES

4. **Participation Constraints**:
   - LIVE_LOCATIONS has total participation in both Tracks and Reports relationships
   - Every location record must have an associated bus and driver

---

## NOTES

- **LIVE_LOCATIONS** is a weak entity because it cannot exist without its parent entities (BUSES and USER_PROFILES/Drivers)
- The **DRIVER_BUS_ASSIGNMENTS** relationship combines driver, bus, and route assignments into a single entity for flexibility
- All entities use UUID as primary keys for better distributed system compatibility
- Geographic data (locations, routes) uses PostGIS extension for spatial queries
- The system supports real-time tracking through continuous updates to LIVE_LOCATIONS










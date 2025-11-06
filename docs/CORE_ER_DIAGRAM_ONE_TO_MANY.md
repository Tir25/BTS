# ER DIAGRAM OF A BUS TRACKING SYSTEM
## One-to-Many Relationships Focus

This ER diagram focuses on the one-to-many relationships in the Bus Tracking System, showing cardinality ratios clearly.

---

## VISUAL REPRESENTATION

```
                    ER DIAGRAM OF A BUS TRACKING SYSTEM
                    (One-to-Many Relationships)
                    
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│    ┌─────────────────┐                                                  │
│    │ USER_PROFILES   │                                                  │
│    └────────┬────────┘                                                  │
│             │                                                            │
│      ┌──────┼──────┐                                                    │
│      │      │      │                                                    │
│      ▼      ▼      ▼                                                    │
│   ┌─────┐ ┌────┐ ┌──────────┐                                          │
│   │ Id  │ │Email│ │Full_Name │                                          │
│   │(PK) │ │     │ │          │                                          │
│   └─────┘ └────┘ └──────────┘                                          │
│                                                                          │
│      ┌──────┼──────┐                                                    │
│      │      │      │                                                    │
│      ▼      ▼      ▼                                                    │
│   ┌────┐ ┌─────┐ ┌───────────┐                                         │
│   │Role│ │Phone│ │License_No │                                         │
│   └────┘ └─────┘ └───────────┘                                         │
│                                                                          │
│                                                                          │
│    ┌─────────────────┐                                                  │
│    │     BUSES       │                                                  │
│    └────────┬────────┘                                                  │
│             │                                                            │
│      ┌──────┼──────┐                                                    │
│      │      │      │                                                    │
│      ▼      ▼      ▼                                                    │
│   ┌─────┐ ┌───────────┐ ┌─────────┐                                    │
│   │ Id  │ │Bus_Number │ │Capacity │                                    │
│   │(PK) │ │           │ │         │                                    │
│   └─────┘ └───────────┘ └─────────┘                                    │
│                                                                          │
│      ┌──────┼──────┐                                                    │
│      │      │      │                                                    │
│      ▼      ▼      ▼                                                    │
│   ┌─────┐ ┌───────────┐ ┌─────┐                                        │
│   │Model│ │Vehicle_No │ │Year │                                        │
│   └─────┘ └───────────┘ └─────┘                                        │
│                                                                          │
│                                                                          │
│    ┌─────────────────┐                                                  │
│    │     ROUTES      │                                                  │
│    └────────┬────────┘                                                  │
│             │                                                            │
│      ┌──────┼──────┐                                                    │
│      │      │      │                                                    │
│      ▼      ▼      ▼                                                    │
│   ┌─────┐ ┌─────┐ ┌───────────┐                                        │
│   │ Id  │ │Name │ │  Origin   │                                        │
│   │(PK) │ │     │ │           │                                        │
│   └─────┘ └─────┘ └───────────┘                                        │
│                                                                          │
│      ┌──────┼──────┐                                                    │
│      │      │      │                                                    │
│      ▼      ▼      ▼                                                    │
│   ┌─────────────┐ ┌───────────┐ ┌────────────────┐                    │
│   │ Destination │ │Distance_km│ │Estimated_Duration│                  │
│   └─────────────┘ └───────────┘ └────────────────┘                    │
│                                                                          │
│                                                                          │
│    ╔═══════════════════════════════════╗                               │
│    ║      LIVE_LOCATIONS               ║                               │
│    ║        (Weak Entity)              ║                               │
│    ╚═══════════┬═══════════════════════╝                               │
│                │                                                        │
│        ┌───────┼───────┐                                               │
│        │       │       │                                               │
│        ▼       ▼       ▼                                               │
│     ┌──────────┐ ┌───────────┐ ┌──────────────┐                      │
│     │ Location │ │Speed_kmh  │ │Heading_Degrees│                      │
│     │  (PK)    │ │           │ │              │                      │
│     └──────────┘ └───────────┘ └──────────────┘                      │
│                                                                          │
│        ┌───────────────┐                                                │
│        │  Recorded_At  │                                                │
│        └───────────────┘                                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


                    ONE-TO-MANY RELATIONSHIPS

┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                    ┌─────────────────┐                                  │
│                    │     ROUTES      │                                  │
│                    │   (1)           │                                  │
│                    └────────┬────────┘                                  │
│                             │                                            │
│                             │                                            │
│                         ╔═══╧═══╗                                       │
│                         ║ Has   ║                                       │
│                         ╚═══╤═══╝                                       │
│                             │                                            │
│                             │                                            │
│                    ┌────────┴────────┐                                  │
│                    │                 │                                  │
│                    │     (N)         │                                  │
│                    │                 │                                  │
│                    ▼                 ▼                                  │
│              ┌─────────────┐                                          │
│              │    BUSES    │                                          │
│              │    (N)      │                                          │
│              └──────┬──────┘                                          │
│                     │                                                   │
│                     │                                                   │
│                 ╔═══╧═══╗                                              │
│                 ║Tracks ║                                              │
│                 ╚═══╤═══╝                                              │
│                     │                                                   │
│                     │                                                   │
│            ┌────────┴────────┐                                         │
│            │                 │                                         │
│            │      (N)        │                                         │
│            │                 │                                         │
│            ▼                 ▼                                         │
│    ╔═══════════════════════════════════╗                              │
│    ║   LIVE_LOCATIONS                  ║                              │
│    ║   (Weak Entity)                   ║                              │
│    ╚═══════════════════════════════════╝                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


                    IDENTIFYING RELATIONSHIPS
                    (One-to-Many with Total Participation)

┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌──────────────┐                                                       │
│  │USER_PROFILES │                                                       │
│  │  (Drivers)   │                                                       │
│  │     (1)      │                                                       │
│  └──────┬───────┘                                                       │
│         │                                                                 │
│         │                                                                 │
│      ╔══╧═══╗                                                           │
│      ║Reports║                                                           │
│      ╚═══╤══╝                                                           │
│          │                                                                 │
│          │                                                                 │
│          │                                                                 │
│          │    (Total Participation - Double Line)                        │
│          │                                                                 │
│          │    (N)                                                         │
│          │                                                                 │
│          ▼                                                                 │
│  ╔═══════════════════════════════════╗                                  │
│  ║   LIVE_LOCATIONS                  ║                                  │
│  ║   (Weak Entity)                   ║                                  │
│  ║      (N)                          ║                                  │
│  ╚═══════════════════════════════════╝                                  │
│                                                                          │
│                                                                          │
│  ┌──────────────┐                                                       │
│  │    BUSES     │                                                       │
│  │     (1)      │                                                       │
│  └──────┬───────┘                                                       │
│         │                                                                 │
│         │                                                                 │
│      ╔══╧═══╗                                                           │
│      ║Tracks║                                                           │
│      ╚═══╤══╝                                                           │
│          │                                                                 │
│          │                                                                 │
│          │    (Total Participation - Double Line)                        │
│          │                                                                 │
│          │    (N)                                                         │
│          │                                                                 │
│          ▼                                                                 │
│  ╔═══════════════════════════════════╗                                  │
│  ║   LIVE_LOCATIONS                  ║                                  │
│  ║   (Weak Entity)                   ║                                  │
│  ║      (N)                          ║                                  │
│  ╚═══════════════════════════════════╝                                  │
│                                                                          │
│                                                                          │
│  ┌──────────────┐                                                       │
│  │    ROUTES    │                                                       │
│  │     (1)      │                                                       │
│  └──────┬───────┘                                                       │
│         │                                                                 │
│         │                                                                 │
│      ╔══╧═══╗                                                           │
│      ║  Has ║                                                           │
│      ╚═══╤══╝                                                           │
│          │                                                                 │
│          │                                                                 │
│          │    (N)                                                         │
│          │                                                                 │
│          ▼                                                                 │
│  ┌──────────────┐                                                       │
│  │    BUSES     │                                                       │
│  │     (N)      │                                                       │
│  └──────────────┘                                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## ONE-TO-MANY RELATIONSHIPS EXPLAINED

### 1. ROUTES → BUSES (One-to-Many)
- **Cardinality**: **1:N**
- **Relationship**: "Has" or "Serves"
- **Meaning**: One ROUTE can have many BUSES assigned to it
- **Implementation**: BUSES table has `route_id` foreign key
- **Attribute on Relationship**: None (or `assigned_at` if tracking assignment time)

```
ROUTES (1) ──Has──> (N) BUSES
```

**Example**:
- Route "Route A" can have Bus #1, Bus #2, Bus #3 assigned to it
- Each bus belongs to only one route at a time (via `route_id`)

---

### 2. BUSES → LIVE_LOCATIONS (One-to-Many, Identifying)
- **Cardinality**: **1:N**
- **Relationship**: "Tracks" (Identifying - Double Diamond)
- **Meaning**: One BUS can have many LIVE_LOCATIONS records
- **Total Participation**: Yes (every location must belong to a bus)
- **Implementation**: LIVE_LOCATIONS table has `bus_id` foreign key
- **Attribute on Relationship**: `Recorded_At` - timestamp when location was tracked

```
BUSES (1) ──Tracks (Identifying)──> (N) LIVE_LOCATIONS
         (Double Line = Total Participation)
```

**Example**:
- Bus #1 can have thousands of location records (one every few seconds)
- Each location record must be associated with exactly one bus

---

### 3. USER_PROFILES (Drivers) → LIVE_LOCATIONS (One-to-Many, Identifying)
- **Cardinality**: **1:N**
- **Relationship**: "Reports" (Identifying - Double Diamond)
- **Meaning**: One DRIVER can report many LIVE_LOCATIONS
- **Total Participation**: Yes (every location must be reported by a driver)
- **Implementation**: LIVE_LOCATIONS table has `driver_id` foreign key
- **Attribute on Relationship**: `Recorded_At` - timestamp when driver reported location

```
USER_PROFILES/Drivers (1) ──Reports (Identifying)──> (N) LIVE_LOCATIONS
                      (Double Line = Total Participation)
```

**Example**:
- Driver "John Doe" can report many location updates as he drives
- Each location record must be associated with exactly one driver

---

## CARDINALITY NOTATION

- **(1)** = One (exactly one)
- **(N)** = Many (zero or more)
- **Double Line** = Total Participation (must participate in relationship)
- **Single Line** = Partial Participation (may or may not participate)
- **Double Diamond (╔═╗)** = Identifying Relationship (for weak entities)

---

## RELATIONSHIP SUMMARY TABLE

| Relationship | Parent Entity | Cardinality | Child Entity | Participation | Type |
|--------------|---------------|-------------|--------------|---------------|------|
| **Has** | ROUTES | **1** | BUSES | **N** | Partial | Regular |
| **Tracks** | BUSES | **1** | LIVE_LOCATIONS | **N** | **Total** | **Identifying** |
| **Reports** | USER_PROFILES (Drivers) | **1** | LIVE_LOCATIONS | **N** | **Total** | **Identifying** |

---

## KEY POINTS

1. **ROUTES → BUSES**: One route can have many buses, but each bus typically belongs to one route
   - Many buses can serve the same route
   - A bus can change routes over time (tracked via assignments)

2. **BUSES → LIVE_LOCATIONS**: One-to-many with total participation
   - Every location record MUST belong to a bus (total participation)
   - A bus can have thousands of location records over time
   - This is an identifying relationship (double diamond) because LIVE_LOCATIONS is a weak entity

3. **USER_PROFILES (Drivers) → LIVE_LOCATIONS**: One-to-many with total participation
   - Every location record MUST be reported by a driver (total participation)
   - A driver reports many location updates during a trip
   - This is also an identifying relationship (double diamond)

4. **LIVE_LOCATIONS is a Weak Entity** because:
   - It depends on both BUSES and USER_PROFILES (drivers)
   - It cannot exist independently
   - It has identifying relationships with both parent entities

---

## DATABASE IMPLEMENTATION

```sql
-- One-to-Many: ROUTES (1) → BUSES (N)
CREATE TABLE buses (
    id UUID PRIMARY KEY,
    route_id UUID REFERENCES routes(id),  -- Foreign Key: Many buses to one route
    ...
);

-- One-to-Many: BUSES (1) → LIVE_LOCATIONS (N)
-- One-to-Many: USER_PROFILES/Drivers (1) → LIVE_LOCATIONS (N)
CREATE TABLE live_locations (
    id UUID PRIMARY KEY,
    bus_id UUID NOT NULL REFERENCES buses(id),      -- Foreign Key: Many locations to one bus
    driver_id UUID NOT NULL REFERENCES user_profiles(id),  -- Foreign Key: Many locations to one driver
    ...
);
```

---

This ER diagram clearly shows the one-to-many relationships in the Bus Tracking System, with proper cardinality notation and participation constraints.










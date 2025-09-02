# Database Tables Reference for Cursor

This document describes every PostgreSQL table required for the University Bus Tracking System, including columns, primary keys (PK), foreign keys (FK), and key constraints. Use this as the single source of truth when creating migrations or defining ORM models.

***

## 1. users  
Stores all user identities (admins, drivers, future roles).  

| Column         | Type          | PK  | FK      | Notes                                |
| -------------- | ------------- | --- | ------- | ------------------------------------ |
| id             | UUID          | Yes |         | Supabase Auth user ID                |
| email          | TEXT          |     |         | Unique                               |
| password_hash  | TEXT          |     |         | Managed by Supabase                  |
| created_at     | TIMESTAMPTZ   |     |         | Default `NOW()`                      |

***

## 2. roles  
Defines available roles.  

| Column | Type   | PK  | FK | Notes                     |
| ------ | ------ | --- | -- | ------------------------- |
| id     | UUID   | Yes |    |                             |
| name   | TEXT   |     |    | Unique: ‘admin’, ‘driver’, etc. |

***

## 3. user_roles  
Associates users with one or more roles (supports temporary grants).  

| Column      | Type           | PK  | FK                     | Notes                                  |
| ----------- | -------------- | --- | ---------------------- | -------------------------------------- |
| id          | UUID           | Yes |                        |                                        |
| user_id     | UUID           |     | users(id)              |                                        |
| role_id     | UUID           |     | roles(id)              |                                        |
| assigned_at | TIMESTAMPTZ    |     |                        | Default `NOW()`                        |
| revoked_at  | TIMESTAMPTZ    |     |                        | Nullable; active while NULL            |

***

## 4. buses  
Represents each physical bus.  

| Column               | Type         | PK  | FK | Notes                       |
| -------------------- | ------------ | --- | -- | --------------------------- |
| id                   | UUID         | Yes |    |                             |
| registration_number  | TEXT         |     |    | Unique                      |
| capacity             | INTEGER      |     |    | Number of seats             |
| model                | TEXT         |     |    |                             |
| created_at           | TIMESTAMPTZ  |     |    | Default `NOW()`             |

***

## 5. drivers  
Holds driver-specific profile details.  

| Column           | Type         | PK  | FK         | Notes                                  |
| ---------------- | ------------ | --- | ---------- | -------------------------------------- |
| id               | UUID         | Yes | users(id)  | One-to-one link to users               |
| name             | TEXT         |     |            |                                        |
| phone            | TEXT         |     |            |                                        |
| license_number   | TEXT         |     |            |                                        |
| created_at       | TIMESTAMPTZ  |     |            | Default `NOW()`                        |

***

## 6. driver_bus_assignments  
Tracks bus assignments per driver over time.  

| Column         | Type         | PK  | FK                   | Notes                                  |
| -------------- | ------------ | --- | -------------------- | -------------------------------------- |
| id             | UUID         | Yes |                      |                                        |
| driver_id      | UUID         |     | drivers(id)          |                                        |
| bus_id         | UUID         |     | buses(id)            |                                        |
| assigned_at    | TIMESTAMPTZ  |     |                      | Default `NOW()`                        |
| unassigned_at  | TIMESTAMPTZ  |     |                      | Nullable                               |

***

## 7. routes  
Defines named routes (e.g., “City Loop”).  

| Column       | Type         | PK  | FK | Notes            |
| ------------ | ------------ | --- | -- | ---------------- |
| id           | UUID         | Yes |    |                  |
| name         | TEXT         |     |    | Unique per campus|
| description  | TEXT         |     |    |                  |
| created_at   | TIMESTAMPTZ  |     |    | Default `NOW()`  |

***

## 8. route_segments  
Ordered stops or segments belonging to a route.  

| Column           | Type           | PK  | FK              | Notes                            |
| ---------------- | -------------- | --- | --------------- | -------------------------------- |
| id               | UUID           | Yes |                 |                                  |
| route_id         | UUID           |     | routes(id)      |                                  |
| sequence_number  | INTEGER        |     |                 | Order within route               |
| location         | GEOGRAPHY(POINT,4326) | |             | Latitude/longitude point         |
| stop_name        | TEXT           |     |                 |                                  |

***

## 9. bus_route_assignments  
Assigns buses to one or multiple routes over time.  

| Column         | Type         | PK  | FK                   | Notes                                  |
| -------------- | ------------ | --- | -------------------- | -------------------------------------- |
| id             | UUID         | Yes |                      |                                        |
| bus_id         | UUID         |     | buses(id)            |                                        |
| route_id       | UUID         |     | routes(id)           |                                        |
| assigned_at    | TIMESTAMPTZ  |     |                      | Default `NOW()`                        |
| unassigned_at  | TIMESTAMPTZ  |     |                      | Nullable                               |

***

## 10. bus_locations  
Records each GPS ping from drivers.  

| Column     | Type                   | PK  | FK             | Notes                                  |
| ---------- | ---------------------- | --- | -------------- | -------------------------------------- |
| id         | UUID                   | Yes |                |                                        |
| bus_id     | UUID                   |     | buses(id)      |                                        |
| driver_id  | UUID                   |     | drivers(id)    |                                        |
| location   | GEOGRAPHY(POINT,4326)  |     |                |                                        |
| speed      | DECIMAL                |     |                | km/h                                   |
| heading    | DECIMAL                |     |                | Degrees                                |
| timestamp  | TIMESTAMPTZ            |     |                | Default `NOW()`                        |

*Index:*  
```sql
CREATE INDEX bus_locations_geom_idx ON bus_locations USING GIST(location);
```

***

## 11. notifications  
Logs notifications sent to users.  

| Column             | Type          | PK  | FK             | Notes                                  |
| ------------------ | ------------- | --- | -------------- | -------------------------------------- |
| id                 | UUID          | Yes |                |                                        |
| type               | TEXT          |     |                | Enum ‘push’, ‘sms’, ‘email’            |
| recipient_user_id  | UUID          |     | users(id)      |                                        |
| payload            | JSONB         |     |                | Message content & metadata             |
| sent_at            | TIMESTAMPTZ   |     |                |                                        |
| status             | TEXT          |     |                | Enum ‘pending’, ‘sent’, ‘failed’       |

***

## 12. maintenance_schedules  
Schedules and records bus maintenance events.  

| Column         | Type         | PK  | FK             | Notes                              |
| -------------- | ------------ | --- | -------------- | ---------------------------------- |
| id             | UUID         | Yes |                |                                    |
| bus_id         | UUID         |     | buses(id)      |                                    |
| scheduled_date | DATE         |     |                |                                    |
| description    | TEXT         |     |                | E.g., “Oil change”                 |
| completed_at   | TIMESTAMPTZ  |     |                | Nullable                           |

***

## 13. push_subscriptions  
Stores Web Push subscription endpoints per user.  

| Column     | Type          | PK  | FK             | Notes                              |
| ---------- | ------------- | --- | -------------- | ---------------------------------- |
| id         | UUID          | Yes |                |                                    |
| user_id    | UUID          |     | users(id)      |                                    |
| endpoint   | TEXT          |     |                | Push service URL                   |
| keys       | JSONB         |     |                | p256dh and auth keys               |
| created_at | TIMESTAMPTZ   |     |                | Default `NOW()`                    |

***

## 14. weather_cache  
(Optional) Caches weather API responses per route segment.  

| Column             | Type         | PK  | FK                   | Notes                              |
| ------------------ | ------------ | --- | -------------------- | ---------------------------------- |
| id                 | UUID         | Yes |                      |                                    |
| route_segment_id   | UUID         |     | route_segments(id)   |                                    |
| data               | JSONB        |     |                      | Raw API response                   |
| fetched_at         | TIMESTAMPTZ  |     |                      |                                    |

***

### Key Relationships & Constraints

- **users ⇄ user_roles ⇄ roles**: Many-to-many via `user_roles` enables flexible role assignments.  
- **users ⇄ drivers**: One-to-one (driver profile extends user).  
- **drivers ⇄ driver_bus_assignments ⇄ buses**: Tracks which driver drives which bus over time.  
- **buses ⇄ bus_route_assignments ⇄ routes**: Tracks bus-to-route assignments (many-to-many).  
- **routes ⇄ route_segments**: One-to-many ordered segments per route.  
- **bus_locations**: References both `buses` and `drivers`, storing spatio-temporal data.  
- **notifications**, **push_subscriptions**: Reference `users` for multi-channel alerts.  
- **maintenance_schedules**: References `buses` for service planning.  

Use this schema document to create database migrations or ORM entities. Ensure all PKs use UUIDs, FKs enforce referential integrity, and PostGIS is enabled for spatial columns.
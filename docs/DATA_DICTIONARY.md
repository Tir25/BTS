# 📊 Bus Tracking System - Data Dictionary

## 📋 **DATA DICTIONARY OVERVIEW**

This document provides a comprehensive Data Dictionary for the Ganpat University Bus Tracking System, detailing the structure, attributes, and relationships of all active and important database tables.

---

## 🎯 **ACTIVE TABLES ANALYSIS**

Based on database analysis, the following tables contain active data and are critical to system operation:

### **High-Priority Tables (Active Data)**
1. **`live_locations`** - 2,395 rows (Primary tracking data)
2. **`profiles`** - 5 rows (User profiles)
3. **`users`** - 5 rows (User accounts)
4. **`user_profiles`** - 4 rows (Extended user data)
5. **`buses`** - 3 rows (Fleet information)
6. **`routes`** - 3 rows (Route definitions)
7. **`default_destination`** - 1 row (Default destinations)
8. **`drivers`** - 1 row (Driver information)
9. **`system_constants`** - 1 row (System configuration)

---

## 🗄️ **DETAILED TABLE STRUCTURES**

### **1. `live_locations` Table**
**Purpose**: Stores real-time GPS location data for all buses
**Row Count**: 2,395 (Most active table)
**Critical Level**: ⭐⭐⭐⭐⭐ (Primary tracking data)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Unique identifier for each location record |
| `bus_id` | UUID | YES | NULL | Foreign key to buses table |
| `location` | PostGIS Point | NO | NULL | GPS coordinates (latitude, longitude) |
| `speed_kmh` | NUMERIC | YES | NULL | Current speed in kilometers per hour |
| `heading_degrees` | NUMERIC | YES | NULL | Direction of travel in degrees (0-360) |
| `recorded_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | When the location was recorded |

**Key Features:**
- **Spatial Data**: Uses PostGIS Point type for efficient geographic queries
- **Real-time Updates**: Continuously updated by driver applications
- **Performance Optimized**: Indexed for fast location-based queries
- **Historical Tracking**: Maintains complete location history

**Usage Patterns:**
- Real-time bus tracking on student map
- ETA calculations for route planning
- Speed and direction analysis
- Historical route analysis

---

### **2. `profiles` Table**
**Purpose**: Extended user profile information for authentication and role management
**Row Count**: 5
**Critical Level**: ⭐⭐⭐⭐⭐ (Authentication core)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | UUID | NO | NULL | Primary key, links to auth.users |
| `full_name` | TEXT | YES | NULL | User's complete name |
| `role` | TEXT | NO | 'student' | User role (student, driver, admin) |
| `created_at` | TIMESTAMPTZ | YES | now() | Profile creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | now() | Last profile update timestamp |
| `email` | TEXT | YES | NULL | User's email address |
| `driver_id` | UUID | YES | NULL | Links to drivers table if user is a driver |

**Key Features:**
- **Role-Based Access**: Controls system access permissions
- **Authentication Integration**: Links to Supabase auth system
- **Driver Association**: Connects profiles to driver records
- **Audit Trail**: Tracks creation and modification times

**Usage Patterns:**
- User authentication and authorization
- Role-based interface access
- Driver profile management
- User account administration

---

### **3. `users` Table**
**Purpose**: Core user account information and contact details
**Row Count**: 5
**Critical Level**: ⭐⭐⭐⭐ (User management)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Unique user identifier |
| `email` | VARCHAR | NO | NULL | User's email address (unique) |
| `role` | VARCHAR | NO | NULL | User role (student, driver, admin) |
| `first_name` | VARCHAR | YES | NULL | User's first name |
| `last_name` | VARCHAR | YES | NULL | User's last name |
| `phone` | VARCHAR | YES | NULL | Contact phone number |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Account creation date |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| `profile_photo_url` | TEXT | YES | NULL | URL to user's profile photo |

**Key Features:**
- **Contact Information**: Complete user contact details
- **Role Management**: User type classification
- **Profile Photos**: Visual identification support
- **Audit Trail**: Creation and modification tracking

**Usage Patterns:**
- User account management
- Contact information display
- Role-based system access
- User identification and communication

---

### **4. `user_profiles` Table**
**Purpose**: Extended user profile data with additional attributes
**Row Count**: 4
**Critical Level**: ⭐⭐⭐ (Extended user data)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `user_id` | UUID | NO | NULL | Foreign key to users table |
| `full_name` | TEXT | YES | NULL | Complete user name |
| `role` | TEXT | NO | NULL | User role assignment |
| `avatar_url` | TEXT | YES | NULL | Profile picture URL |
| `created_at` | TIMESTAMPTZ | YES | now() | Profile creation timestamp |

**Key Features:**
- **Profile Pictures**: Avatar management
- **Role Assignment**: User type classification
- **User Association**: Links to main users table
- **Creation Tracking**: Audit trail maintenance

**Usage Patterns:**
- User interface display
- Profile management
- Avatar handling
- Role-based features

---

### **5. `buses` Table**
**Purpose**: Fleet management and bus information
**Row Count**: 3
**Critical Level**: ⭐⭐⭐⭐⭐ (Fleet core)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Unique bus identifier |
| `code` | TEXT | NO | NULL | Bus identification code |
| `name` | TEXT | YES | NULL | Bus display name |
| `route_id` | UUID | YES | NULL | Assigned route identifier |
| `driver_id` | UUID | YES | NULL | Assigned driver identifier |
| `photo_url` | TEXT | YES | NULL | Bus photo URL |
| `is_active` | BOOLEAN | YES | true | Bus operational status |
| `updated_at` | TIMESTAMPTZ | YES | now() | Last update timestamp |
| `assigned_driver_id` | UUID | YES | NULL | Currently assigned driver |
| `bus_image_url` | TEXT | YES | NULL | Bus image for display |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Bus registration date |
| `number_plate` | VARCHAR | YES | NULL | Vehicle registration number |
| `capacity` | INTEGER | YES | NULL | Passenger seating capacity |
| `model` | VARCHAR | YES | NULL | Bus model information |
| `year` | INTEGER | YES | NULL | Manufacturing year |

**Key Features:**
- **Fleet Management**: Complete bus information
- **Route Assignment**: Links buses to specific routes
- **Driver Assignment**: Tracks current driver assignments
- **Capacity Planning**: Passenger capacity information
- **Visual Identification**: Photos and images for recognition

**Usage Patterns:**
- Fleet management dashboard
- Bus assignment and tracking
- Capacity planning
- Visual identification on maps
- Driver-bus-route relationships

---

### **6. `routes` Table**
**Purpose**: Route definitions with geographic data and metadata
**Row Count**: 3
**Critical Level**: ⭐⭐⭐⭐⭐ (Route planning core)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Unique route identifier |
| `name` | TEXT | NO | NULL | Route name/identifier |
| `description` | TEXT | YES | NULL | Route description |
| `geom` | PostGIS Geometry | NO | NULL | Route geometry (LineString) |
| `total_distance_m` | INTEGER | YES | NULL | Total route distance in meters |
| `map_image_url` | TEXT | YES | NULL | Route map image URL |
| `is_active` | BOOLEAN | YES | true | Route operational status |
| `updated_at` | TIMESTAMPTZ | YES | now() | Last update timestamp |
| `stops` | PostGIS Geometry | YES | NULL | Route stops geometry |
| `distance_km` | NUMERIC | YES | NULL | Route distance in kilometers |
| `estimated_duration_minutes` | INTEGER | YES | NULL | Estimated travel time |
| `route_map_url` | TEXT | YES | NULL | Route map URL |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Route creation date |
| `origin` | VARCHAR | YES | 'Unknown' | Route starting point |
| `destination` | VARCHAR | YES | 'Ganpat University' | Route ending point |
| `destination_coordinates` | PostGIS Point | YES | NULL | Destination GPS coordinates |
| `use_custom_arrival` | BOOLEAN | YES | false | Custom arrival point flag |
| `custom_arrival_point` | VARCHAR | YES | NULL | Custom arrival location name |
| `custom_arrival_coordinates` | PostGIS Point | YES | NULL | Custom arrival coordinates |
| `use_custom_starting_point` | BOOLEAN | YES | false | Custom starting point flag |
| `custom_starting_point` | VARCHAR | YES | NULL | Custom starting location name |
| `custom_starting_coordinates` | PostGIS Point | YES | NULL | Custom starting coordinates |
| `arrival_point_type` | VARCHAR | YES | 'ganpat_university' | Arrival point classification |
| `starting_point_type` | VARCHAR | YES | 'route_origin' | Starting point classification |
| `use_custom_origin` | BOOLEAN | YES | false | Custom origin point flag |
| `custom_origin_point` | VARCHAR | YES | NULL | Custom origin location name |
| `custom_origin_coordinates` | PostGIS Point | YES | NULL | Custom origin coordinates |
| `origin_point_type` | VARCHAR | YES | 'driver_location' | Origin point classification |
| `city` | VARCHAR | YES | NULL | Route city/location |
| `custom_destination` | VARCHAR | YES | NULL | Custom destination name |
| `custom_destination_coordinates` | PostGIS Point | YES | NULL | Custom destination coordinates |
| `custom_origin` | VARCHAR | YES | NULL | Custom origin name |
| `bus_stops` | JSONB | YES | '[]' | Bus stops as JSON array |
| `last_eta_calculation` | TIMESTAMPTZ | YES | NULL | Last ETA calculation timestamp |
| `current_eta_minutes` | INTEGER | YES | NULL | Current estimated arrival time |

**Key Features:**
- **Spatial Data**: PostGIS geometry for route visualization
- **Flexible Routing**: Custom origin/destination points
- **ETA Calculation**: Real-time arrival time estimates
- **Stop Management**: JSON-based bus stop configuration
- **Distance Tracking**: Multiple distance measurements
- **Visual Mapping**: Route map integration

**Usage Patterns:**
- Route planning and visualization
- ETA calculations for students
- Driver navigation assistance
- Geographic analysis and optimization
- Custom route configuration

---

### **7. `drivers` Table**
**Purpose**: Driver information and credentials
**Row Count**: 1
**Critical Level**: ⭐⭐⭐⭐ (Driver management)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `driver_id` | UUID | NO | gen_random_uuid() | Unique driver identifier |
| `license_no` | TEXT | YES | NULL | Driver's license number |
| `phone` | TEXT | YES | NULL | Driver's contact phone |
| `photo_url` | TEXT | YES | NULL | Driver's photo URL |
| `created_at` | TIMESTAMPTZ | YES | now() | Driver registration date |
| `id` | UUID | NO | gen_random_uuid() | Alternative ID field |
| `driver_name` | VARCHAR | YES | NULL | Driver's full name |
| `license_number` | VARCHAR | YES | NULL | Alternative license field |
| `email` | VARCHAR | YES | NULL | Driver's email address |

**Key Features:**
- **Driver Identification**: Complete driver information
- **License Management**: Driver license tracking
- **Contact Information**: Communication details
- **Visual Identification**: Driver photos for recognition
- **Audit Trail**: Registration and update tracking

**Usage Patterns:**
- Driver authentication
- Contact information display
- License verification
- Driver-bus assignment
- Visual identification

---

### **8. `default_destination` Table**
**Purpose**: Predefined destination points for route planning
**Row Count**: 1
**Critical Level**: ⭐⭐⭐ (Route configuration)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Unique destination identifier |
| `name` | VARCHAR | NO | NULL | Destination name |
| `description` | TEXT | YES | NULL | Destination description |
| `location` | PostGIS Point | NO | NULL | Destination GPS coordinates |
| `address` | TEXT | YES | NULL | Physical address |
| `is_active` | BOOLEAN | YES | true | Destination availability status |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |

**Key Features:**
- **Spatial Data**: GPS coordinates for mapping
- **Address Information**: Physical location details
- **Status Management**: Active/inactive destination tracking
- **Audit Trail**: Creation and modification tracking

**Usage Patterns:**
- Route destination configuration
- ETA calculations
- Geographic reference points
- Address validation

---

### **9. `system_constants` Table**
**Purpose**: System configuration and constants
**Row Count**: 1
**Critical Level**: ⭐⭐⭐ (System configuration)

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | INTEGER | NO | nextval() | Auto-incrementing identifier |
| `constant_name` | VARCHAR | NO | NULL | Configuration parameter name |
| `constant_value` | JSONB | NO | NULL | Configuration value (JSON format) |
| `description` | TEXT | YES | NULL | Parameter description |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |

**Key Features:**
- **Flexible Configuration**: JSON-based parameter values
- **System Settings**: Centralized configuration management
- **Documentation**: Parameter descriptions
- **Version Control**: Creation and update tracking

**Usage Patterns:**
- System configuration management
- Feature flags and settings
- Application parameters
- Environment-specific configurations

---

## 🔗 **TABLE RELATIONSHIPS**

### **Primary Relationships:**

1. **`live_locations` ↔ `buses`**
   - `live_locations.bus_id` → `buses.id`
   - **Purpose**: Track which bus each location belongs to

2. **`profiles` ↔ `drivers`**
   - `profiles.driver_id` → `drivers.driver_id`
   - **Purpose**: Link user profiles to driver information

3. **`buses` ↔ `routes`**
   - `buses.route_id` → `routes.id`
   - **Purpose**: Assign buses to specific routes

4. **`buses` ↔ `drivers`**
   - `buses.assigned_driver_id` → `drivers.driver_id`
   - **Purpose**: Track current driver assignments

5. **`profiles` ↔ `users`**
   - `profiles.id` → `users.id` (via Supabase auth)
   - **Purpose**: Link profiles to user accounts

### **Data Flow Patterns:**

1. **Real-time Tracking**: `live_locations` → Map Display
2. **User Authentication**: `profiles` + `users` → Access Control
3. **Fleet Management**: `buses` + `drivers` + `routes` → Operations
4. **Route Planning**: `routes` + `default_destination` → Navigation

---

## 📊 **DATA VOLUME ANALYSIS**

### **Active Data Distribution:**
- **`live_locations`**: 2,395 rows (99.6% of active data)
- **User Tables**: 14 rows total (profiles, users, user_profiles)
- **Fleet Tables**: 4 rows total (buses, drivers)
- **Route Tables**: 4 rows total (routes, default_destination)
- **System Tables**: 1 row (system_constants)

### **Data Growth Patterns:**
- **`live_locations`**: High-frequency updates (real-time tracking)
- **User Tables**: Low-frequency updates (account management)
- **Fleet Tables**: Medium-frequency updates (assignments)
- **Route Tables**: Low-frequency updates (route planning)

---

## 🎯 **BUSINESS RULES**

### **Data Integrity Rules:**

1. **Location Data**:
   - All `live_locations` must have valid GPS coordinates
   - Speed values must be non-negative
   - Heading values must be between 0-360 degrees

2. **User Management**:
   - Each user can have only one profile
   - Driver profiles must link to driver records
   - Email addresses must be unique

3. **Fleet Management**:
   - Each bus can be assigned to only one route at a time
   - Each bus can have only one assigned driver
   - Inactive buses should not receive location updates

4. **Route Planning**:
   - Routes must have valid geometry data
   - Custom coordinates must be valid GPS points
   - ETA calculations require current location data

### **Operational Rules:**

1. **Real-time Updates**: Location data updated every 30 seconds
2. **Driver Assignment**: Drivers can be reassigned between routes
3. **Route Activation**: Only active routes appear in tracking
4. **Data Retention**: Location history maintained for 30 days

---

## 🔧 **PERFORMANCE CONSIDERATIONS**

### **Indexing Strategy:**
- **Spatial Indexes**: On all PostGIS geometry columns
- **Time-based Indexes**: On timestamp columns for historical queries
- **Foreign Key Indexes**: On all relationship columns
- **Composite Indexes**: For complex queries (bus_id + timestamp)

### **Query Optimization:**
- **Location Queries**: Use spatial indexes for geographic searches
- **Time-based Queries**: Use timestamp indexes for historical data
- **User Queries**: Use UUID indexes for fast user lookups
- **Route Queries**: Use geometry indexes for route calculations

### **Data Archiving:**
- **Location Data**: Archive after 30 days for performance
- **User Data**: Retain indefinitely for audit purposes
- **Route Data**: Retain for historical analysis
- **System Data**: Retain for configuration history

---

## 📋 **PRESENTATION NOTES**

### **Key Data Insights:**

1. **High Activity**: 2,395 location records indicate active system usage
2. **User Base**: 5 active users with role-based access
3. **Fleet Size**: 3 buses with route assignments
4. **Route Coverage**: 3 active routes with spatial data
5. **Real-time Capability**: Continuous location tracking

### **Technical Achievements:**

1. **Spatial Database**: PostGIS integration for geographic data
2. **Real-time Tracking**: High-frequency location updates
3. **Role-based Access**: Multi-user system with permissions
4. **Fleet Management**: Complete bus-driver-route relationships
5. **Scalable Architecture**: UUID-based identifiers for growth

### **Business Value:**

1. **Operational Efficiency**: Real-time fleet monitoring
2. **User Experience**: Live tracking and ETA calculations
3. **Data-Driven Decisions**: Historical analysis capabilities
4. **Scalability**: Cloud-ready database architecture
5. **Compliance**: Audit trail and data integrity

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Database Status**: Active and Operational  
**Data Integrity**: ✅ Verified

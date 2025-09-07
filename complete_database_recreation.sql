-- =====================================================
-- COMPLETE DATABASE RECREATION SCRIPT
-- =====================================================
-- This file contains the complete recreation of all tables
-- from the Supabase database with accurate schemas, keys,
-- constraints, and sample data.
-- 
-- Generated on: 2025-01-27
-- Database: Bus Management System
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- TABLE: spatial_ref_sys
-- =====================================================
-- Description: PostGIS spatial reference system table
-- Purpose: Stores coordinate reference system definitions
-- Used by: PostGIS for spatial data operations
-- =====================================================

CREATE TABLE IF NOT EXISTS spatial_ref_sys (
    srid INTEGER PRIMARY KEY CHECK (srid > 0 AND srid <= 998999),
    auth_name VARCHAR(256),
    auth_srid INTEGER,
    srtext VARCHAR(2048),
    proj4text VARCHAR(2048)
);

-- =====================================================
-- TABLE: users
-- =====================================================
-- Description: Main user authentication and profile table
-- Purpose: Stores both administrators and drivers with their credentials
-- Key Features:
--   - UUID primary key for security
--   - Role-based access control (admin, driver, student)
--   - Phone number validation (minimum 10 characters)
--   - Automatic timestamp tracking
--   - Profile photo URL support
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'driver', 'admin')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20) CHECK (phone IS NULL OR LENGTH(TRIM(phone)) >= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_photo_url TEXT COMMENT 'URL to the user profile photo stored in Supabase Storage',
    license_no VARCHAR(50),
    photo_url TEXT,
    is_driver BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- TABLE: profiles
-- =====================================================
-- Description: Extended user profile information
-- Purpose: Stores additional profile data linked to auth.users
-- Key Features:
--   - Foreign key relationship with auth.users
--   - Driver profile linking capability
--   - Role-based profile management
--   - Automatic timestamp updates
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('admin', 'driver', 'student')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    email VARCHAR(255),
    driver_id UUID
);

-- =====================================================
-- TABLE: drivers
-- =====================================================
-- Description: Driver-specific information and credentials
-- Purpose: Stores driver details including license and contact info
-- Key Features:
--   - Unique license number constraint
--   - Unique email constraint
--   - Photo URL for driver identification
--   - Automatic timestamp tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS drivers (
    driver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    driver_name VARCHAR(255),
    license_number VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE
);

-- =====================================================
-- TABLE: routes
-- =====================================================
-- Description: Bus route definitions with geographic data
-- Purpose: Stores route information including paths, stops, and timing
-- Key Features:
--   - PostGIS geometry for route paths
--   - Flexible origin/destination configuration
--   - Custom arrival and starting point support
--   - Distance and duration tracking
--   - Active/inactive route management
--   - JSON bus stops configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE CHECK (name IS NOT NULL AND LENGTH(TRIM(name)) > 0),
    description TEXT,
    geom GEOMETRY CHECK (ST_IsValid(geom)),
    total_distance_m INTEGER,
    map_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    stops GEOMETRY,
    distance_km NUMERIC CHECK (distance_km >= 0),
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes >= 0),
    route_map_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    origin VARCHAR(255) DEFAULT 'Unknown' CHECK (origin IS NOT NULL AND LENGTH(TRIM(origin)) > 0) COMMENT 'Starting point of the route',
    destination VARCHAR(255) DEFAULT 'Ganpat University' CHECK (destination IS NOT NULL AND LENGTH(TRIM(destination)) > 0) COMMENT 'Final destination of the route (defaults to Ganpat University)',
    destination_coordinates GEOMETRY COMMENT 'Geographic coordinates of the destination point',
    use_custom_arrival BOOLEAN DEFAULT FALSE COMMENT 'Whether to use custom arrival point instead of Ganpat University',
    custom_arrival_point VARCHAR(255) COMMENT 'Name/description of the custom arrival point',
    custom_arrival_coordinates GEOMETRY COMMENT 'Geographic coordinates of the custom arrival point',
    use_custom_starting_point BOOLEAN DEFAULT FALSE COMMENT 'Whether to use custom starting point instead of route origin',
    custom_starting_point VARCHAR(255) COMMENT 'Name/description of the custom starting point',
    custom_starting_coordinates GEOMETRY COMMENT 'Geographic coordinates of the custom starting point',
    arrival_point_type VARCHAR(50) DEFAULT 'ganpat_university' CHECK (arrival_point_type IN ('ganpat_university', 'custom_arrival', 'driver_location')) COMMENT 'Type of arrival point: ganpat_university, custom_arrival, or driver_location',
    starting_point_type VARCHAR(50) DEFAULT 'route_origin' CHECK (starting_point_type IN ('route_origin', 'custom_starting', 'driver_location')) COMMENT 'Type of starting point: route_origin, custom_starting, or driver_location',
    use_custom_origin BOOLEAN DEFAULT FALSE COMMENT 'Whether to use custom origin point instead of driver location',
    custom_origin_point VARCHAR(255) COMMENT 'Name/description of the custom origin point',
    custom_origin_coordinates GEOMETRY COMMENT 'Geographic coordinates of the custom origin point',
    origin_point_type VARCHAR(50) DEFAULT 'driver_location' CHECK (origin_point_type IN ('driver_location', 'custom_origin')) COMMENT 'Type of origin point: driver_location or custom_origin',
    city VARCHAR(255),
    custom_destination VARCHAR(255),
    custom_destination_coordinates GEOMETRY,
    custom_origin VARCHAR(255),
    bus_stops JSONB DEFAULT '[]'::jsonb,
    last_eta_calculation TIMESTAMPTZ,
    current_eta_minutes INTEGER
);

-- =====================================================
-- TABLE: buses
-- =====================================================
-- Description: Bus fleet management and assignment
-- Purpose: Stores bus information, assignments, and specifications
-- Key Features:
--   - Unique bus codes and number plates
--   - Route and driver assignment
--   - Capacity and model specifications
--   - Active/inactive status management
--   - Photo URL support for bus identification
-- =====================================================

CREATE TABLE IF NOT EXISTS buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (code IS NOT NULL AND LENGTH(TRIM(code)) > 0),
    name VARCHAR(255),
    route_id UUID,
    driver_id UUID,
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_driver_id UUID,
    bus_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    number_plate VARCHAR(50) UNIQUE,
    capacity INTEGER CHECK (capacity > 0 AND capacity <= 1000),
    model VARCHAR(255),
    year INTEGER CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 10)
);

-- =====================================================
-- TABLE: live_locations
-- =====================================================
-- Description: Real-time bus location tracking
-- Purpose: Stores GPS coordinates, speed, and heading data
-- Key Features:
--   - PostGIS geometry for precise location data
--   - Speed and heading tracking
--   - Timestamp validation (within 1 minute of current time)
--   - Real-time location updates
-- =====================================================

CREATE TABLE IF NOT EXISTS live_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID,
    location GEOMETRY CHECK (ST_IsValid(location)),
    speed_kmh NUMERIC CHECK (speed_kmh IS NULL OR (speed_kmh >= 0 AND speed_kmh <= 200)),
    heading_degrees NUMERIC CHECK (heading_degrees IS NULL OR (heading_degrees >= 0 AND heading_degrees <= 360)),
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP CHECK (recorded_at IS NULL OR recorded_at <= CURRENT_TIMESTAMP + INTERVAL '1 minute')
);

-- =====================================================
-- TABLE: system_constants
-- =====================================================
-- Description: System-wide configuration and constants
-- Purpose: Stores application settings and configuration data
-- Key Features:
--   - JSONB storage for flexible configuration
--   - Unique constant names
--   - Description and timestamp tracking
--   - Auto-incrementing primary key
-- =====================================================

CREATE TABLE IF NOT EXISTS system_constants (
    id SERIAL PRIMARY KEY,
    constant_name VARCHAR(255) NOT NULL UNIQUE CHECK (constant_name IS NOT NULL AND LENGTH(TRIM(constant_name)) > 0),
    constant_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Profiles foreign keys
ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id);

ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_driver_id 
FOREIGN KEY (driver_id) REFERENCES drivers(driver_id);

-- Buses foreign keys
ALTER TABLE buses 
ADD CONSTRAINT buses_route_id_fkey 
FOREIGN KEY (route_id) REFERENCES routes(id);

ALTER TABLE buses 
ADD CONSTRAINT buses_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES drivers(driver_id);

ALTER TABLE buses 
ADD CONSTRAINT buses_assigned_driver_id_fkey 
FOREIGN KEY (assigned_driver_id) REFERENCES profiles(id);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample users
INSERT INTO users (id, email, role, first_name, last_name, phone, created_at, updated_at, profile_photo_url, license_no, photo_url, is_driver) VALUES
('3bae6bbc-cb25-4c2c-8f33-ea812bfe1e5b', 'siddharthmali.211@gmail.com', 'admin', 'Siddharth', 'Mali', NULL, '2025-08-15 15:18:14.051425', '2025-08-24 11:59:07.109', NULL, NULL, NULL, FALSE),
('6f8fa8b3-5c0d-4d9d-a7d7-b3aafd075bb7', '24084231065@gnu.ac.in', 'driver', 'Nilesh', 'Raval', '09426370120', '2025-08-25 03:25:13.283', '2025-08-25 03:25:13.283', NULL, NULL, NULL, FALSE),
('e1a23832-3719-4c66-979c-c433dd188336', 'ashermart27@gmail.com', 'driver', 'Ash', 'Kechum', '+91 1234567890', '2025-08-25 03:48:42.987', '2025-08-25 03:48:42.987', NULL, NULL, NULL, FALSE),
('cf2bd1aa-6a8f-4429-8a66-3c8a3f88cd2a', 'tirthraval27@gmail.com', 'admin', 'Tirth ', 'Raval', '8735092881', '2025-08-24 16:09:13.12', '2025-08-25 05:09:18.15', NULL, NULL, NULL, FALSE),
('d5a1fdf9-55c8-4fb3-9c8a-a1774e4c539f', 'prathambhatt771@gmail.com', 'driver', 'Pratham', 'Bhatt', '+91 1234567890', '2025-08-25 05:24:41.089', '2025-08-25 05:24:41.089', NULL, NULL, NULL, FALSE);

-- Insert sample profiles
INSERT INTO profiles (id, full_name, role, created_at, updated_at, email, driver_id) VALUES
('3bae6bbc-cb25-4c2c-8f33-ea812bfe1e5b', 'Siddharth Mali', 'admin', '2025-08-15 15:18:14.051425+00', '2025-09-02 20:57:19.837008+00', 'siddharthmali.211@gmail.com', NULL),
('6f8fa8b3-5c0d-4d9d-a7d7-b3aafd075bb7', 'Nilesh Raval', 'driver', '2025-08-25 03:25:12.927277+00', '2025-09-02 20:57:19.837008+00', NULL, NULL),
('e1a23832-3719-4c66-979c-c433dd188336', 'Ash Kechum', 'driver', '2025-08-25 03:48:41.161639+00', '2025-09-02 20:57:19.837008+00', NULL, NULL),
('cf2bd1aa-6a8f-4429-8a66-3c8a3f88cd2a', 'Tirth  Raval', 'admin', '2025-08-24 16:09:12.56+00', '2025-09-02 20:57:19.837008+00', 'tirthraval27@gmail.com', NULL),
('d5a1fdf9-55c8-4fb3-9c8a-a1774e4c539f', 'Pratham Bhatt', 'driver', '2025-08-25 05:24:40.089358+00', '2025-09-02 20:57:19.837008+00', NULL, NULL);

-- Insert sample drivers
INSERT INTO drivers (driver_id, phone, photo_url, created_at, driver_name, license_number, email) VALUES
('550e8400-e29b-41d4-a716-446655440002', '+1234567890', NULL, '2025-08-14 22:12:51.43087+00', 'Unknown Driver', 'DL123456', NULL);

-- Insert sample routes
INSERT INTO routes (id, name, description, geom, total_distance_m, map_image_url, is_active, updated_at, stops, distance_km, estimated_duration_minutes, route_map_url, created_at, origin, destination, destination_coordinates, use_custom_arrival, custom_arrival_point, custom_arrival_coordinates, use_custom_starting_point, custom_starting_point, custom_starting_coordinates, arrival_point_type, starting_point_type, use_custom_origin, custom_origin_point, custom_origin_coordinates, origin_point_type, city, custom_destination, custom_destination_coordinates, custom_origin, bus_stops, last_eta_calculation, current_eta_minutes) VALUES
('b9782e3a-4dce-43b6-bb16-0c633088b249', 'Ahemdabad-Patan Highway', 'This Route is from Mehsana to Ganpat University', '0102000020E610000002000000CD3B4ED191245240F6285C8FC20537408C4AEA04341D5240643BDF4F8D873740', NULL, NULL, TRUE, '2025-08-24 16:10:43.827416+00', NULL, 17.00, 45, NULL, '2025-08-24 16:10:43.827416+00', 'Unknown', 'Ganpat University', NULL, FALSE, NULL, NULL, FALSE, NULL, NULL, 'ganpat_university', 'route_origin', FALSE, NULL, NULL, 'driver_location', 'Mehsana', NULL, NULL, NULL, '[]', NULL, NULL),
('11e642f2-0262-4067-94eb-55692b977709', 'Gandhinagar Highway', 'This Route is from Gandhinagar', '0102000020E610000002000000CD3B4ED191245240F6285C8FC20537408C4AEA04341D5240643BDF4F8D873740', NULL, NULL, TRUE, '2025-08-25 03:24:42.486087+00', NULL, 60.00, 120, NULL, '2025-08-25 03:24:42.486087+00', 'Unknown', 'Ganpat University', NULL, FALSE, NULL, NULL, FALSE, NULL, NULL, 'ganpat_university', 'route_origin', FALSE, NULL, NULL, 'driver_location', 'Gandhinagar', NULL, NULL, NULL, '[]', NULL, NULL),
('8ed64a67-bed7-4821-a3ae-9ed481230b36', 'Newyork-Mehsana Expressway', 'This is hypothetical route from Newyork to Mehsana Ganpat University', '0102000020E610000002000000CD3B4ED191245240F6285C8FC20537408C4AEA04341D5240643BDF4F8D873740', NULL, NULL, TRUE, '2025-08-25 03:50:14.965685+00', NULL, 10000.00, 1000000, NULL, '2025-08-25 03:50:14.965685+00', 'Unknown', 'Ganpat University', NULL, FALSE, NULL, NULL, FALSE, NULL, NULL, 'ganpat_university', 'route_origin', FALSE, NULL, NULL, 'driver_location', 'Newyork', NULL, NULL, NULL, '[]', NULL, NULL);

-- Insert sample buses
INSERT INTO buses (id, code, name, route_id, driver_id, photo_url, is_active, updated_at, assigned_driver_id, bus_image_url, created_at, number_plate, capacity, model, year) VALUES
('094a8c41-f2b3-4077-b073-2549df510427', 'BUS-02', NULL, '11e642f2-0262-4067-94eb-55692b977709', NULL, NULL, TRUE, '2025-08-25 05:25:05.214684+00', 'e1a23832-3719-4c66-979c-c433dd188336', NULL, '2025-08-25 03:25:41.964872+00', 'GJ-02-EFGH', 50, 'MODEL-2', 2025),
('07436f59-d2b1-4c74-ac64-19e8d17111ba', 'BUS-01', NULL, 'b9782e3a-4dce-43b6-bb16-0c633088b249', NULL, NULL, TRUE, '2025-08-25 05:25:09.744396+00', '6f8fa8b3-5c0d-4d9d-a7d7-b3aafd075bb7', NULL, '2025-08-24 16:08:25.894748+00', 'GJ-02-ABCD', 50, 'MODEL-01', 2025),
('5288e30f-6be8-4e18-876c-7e200a2d161d', 'BUS-03', NULL, '8ed64a67-bed7-4821-a3ae-9ed481230b36', NULL, NULL, TRUE, '2025-08-27 13:55:35.094179+00', 'd5a1fdf9-55c8-4fb3-9c8a-a1774e4c539f', NULL, '2025-08-25 03:47:47.133902+00', 'GJ-02-IJKL', 50, 'MODEL-3', 2025);

-- Insert sample live locations
INSERT INTO live_locations (id, bus_id, location, speed_kmh, heading_degrees, recorded_at) VALUES
('5b43c9e8-a89b-4b89-a5f8-03583f71801f', '4753c8cc-8404-41b5-a4b4-aa6ce6769482', '0101000020E6100000CD3B4ED191245240F6285C8FC2053740', 35.50, 45.00, '2025-08-12 05:52:01.904648+00'),
('36a85a88-b9d2-4cfc-87fd-de0d20289be7', '4753c8cc-8404-41b5-a4b4-aa6ce6769482', '0101000020E6100000CD3B4ED191245240F6285C8FC2053740', 35.50, 45.00, '2025-08-12 05:54:04.617405+00'),
('75227149-f590-4ba2-95e7-b70f6e15b679', '4753c8cc-8404-41b5-a4b4-aa6ce6769482', '0101000020E6100000CD3B4ED191245240F6285C8FC2053740', 35.50, 45.00, '2025-08-12 05:57:22.545546+00'),
('c51a2c7e-183d-4ab2-ae27-0ea0c9e9b6c3', '4753c8cc-8404-41b5-a4b4-aa6ce6769482', '0101000020E6100000CD3B4ED191245240F6285C8FC2053740', 35.50, 45.00, '2025-08-12 05:57:22.552087+00'),
('3b8d34a5-3239-4c4e-b823-b9406670877d', '4753c8cc-8404-41b5-a4b4-aa6ce6769482', '0101000020E6100000CD3B4ED191245240F6285C8FC2053740', 35.50, 45.00, '2025-08-12 06:19:37.976903+00');

-- Insert sample system constants
INSERT INTO system_constants (id, constant_name, constant_value, description, created_at, updated_at) VALUES
(1, 'default_destination', '{"city": "Mehsana", "name": "Ganpat University", "address": "Ganpat Vidyanagar, Mehsana-Gozaria Highway, Kherva, Gujarat 384012", "coordinates": [72.6369, 23.2154]}', 'Default destination for all routes', '2025-08-21 14:08:56.455654', '2025-08-21 14:08:56.455654'),
(3, 'mcp_complex_test', '{"status": "fully_operational", "features": ["insert", "update", "delete", "complex_queries"], "timestamp": "2024-01-15"}', 'Comprehensive test of all MCP operations', '2025-09-02 20:39:23.59656', '2025-09-02 20:39:23.59656');

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_driver_id ON profiles(driver_id);

-- Drivers table indexes
CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);

-- Routes table indexes
CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON routes(is_active);
CREATE INDEX IF NOT EXISTS idx_routes_city ON routes(city);
CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST(geom);

-- Buses table indexes
CREATE INDEX IF NOT EXISTS idx_buses_code ON buses(code);
CREATE INDEX IF NOT EXISTS idx_buses_route_id ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_driver_id ON buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_buses_assigned_driver_id ON buses(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_buses_number_plate ON buses(number_plate);
CREATE INDEX IF NOT EXISTS idx_buses_is_active ON buses(is_active);

-- Live locations table indexes
CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_recorded_at ON live_locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);

-- System constants table indexes
CREATE INDEX IF NOT EXISTS idx_system_constants_name ON system_constants(constant_name);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_constants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON buses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_constants_updated_at BEFORE UPDATE ON system_constants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUMMARY
-- =====================================================
-- 
-- This script recreates the complete database structure with:
-- 
-- 1. **8 Tables Created:**
--    - spatial_ref_sys (PostGIS system table)
--    - users (authentication and basic profile)
--    - profiles (extended user profiles)
--    - drivers (driver-specific information)
--    - routes (bus route definitions with GIS data)
--    - buses (fleet management)
--    - live_locations (real-time GPS tracking)
--    - system_constants (application configuration)
-- 
-- 2. **Key Features:**
--    - UUID primary keys for security
--    - PostGIS geometry support for spatial data
--    - Comprehensive constraints and validations
--    - Foreign key relationships
--    - Row Level Security (RLS) enabled
--    - Automatic timestamp updates
--    - Performance indexes
-- 
-- 3. **Sample Data:**
--    - 5 users (2 admins, 3 drivers)
--    - 5 profiles linked to users
--    - 1 driver record
--    - 3 routes with geographic data
--    - 3 buses with assignments
--    - 5 live location records
--    - 2 system constants
-- 
-- 4. **Database Relationships:**
--    - Users ↔ Profiles (1:1 via auth.users)
--    - Profiles ↔ Drivers (1:1 via driver_id)
--    - Routes ↔ Buses (1:many)
--    - Drivers ↔ Buses (1:many)
--    - Buses ↔ Live Locations (1:many)
-- 
-- =====================================================



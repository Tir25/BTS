-- Fixed Database Schema Migration for Admin Data Loading
-- This migration properly handles foreign key constraints and data integrity

-- Step 1: Create user_profiles table first (no dependencies)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'driver', 'admin', 'faculty')),
    is_driver BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create routes table (no dependencies on user_profiles)
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    distance_km DECIMAL(10,2) DEFAULT 0,
    estimated_duration_minutes INTEGER DEFAULT 0,
    city VARCHAR(100),
    custom_origin TEXT,
    custom_destination TEXT,
    origin_coordinates GEOMETRY(POINT, 4326),
    destination_coordinates GEOMETRY(POINT, 4326),
    bus_stops JSONB,
    stops GEOMETRY(LINESTRING, 4326),
    current_eta_minutes INTEGER,
    last_eta_calculation TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create buses table with proper foreign key references
CREATE TABLE IF NOT EXISTS buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number VARCHAR(20) UNIQUE,
    vehicle_no VARCHAR(20) UNIQUE,
    capacity INTEGER NOT NULL,
    model VARCHAR(100),
    year INTEGER,
    bus_image_url TEXT,
    assigned_driver_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create bus_locations table for real-time tracking
CREATE TABLE IF NOT EXISTS bus_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    speed DECIMAL(5,2),
    heading DECIMAL(5,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create live_locations table (alternative to bus_locations)
CREATE TABLE IF NOT EXISTS live_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    speed_kmh DECIMAL(5,2),
    heading_degrees DECIMAL(5,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_driver ON user_profiles(is_driver);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_buses_bus_number ON buses(bus_number);
CREATE INDEX IF NOT EXISTS idx_buses_vehicle_no ON buses(vehicle_no);
CREATE INDEX IF NOT EXISTS idx_buses_assigned_driver ON buses(assigned_driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_buses_route_id ON buses(route_id);

CREATE INDEX IF NOT EXISTS idx_routes_city ON routes(city);
CREATE INDEX IF NOT EXISTS idx_routes_distance ON routes(distance_km);

CREATE INDEX IF NOT EXISTS idx_bus_locations_bus_id ON bus_locations(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_locations_timestamp ON bus_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_bus_locations_location ON bus_locations USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_recorded_at ON live_locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);

-- Step 7: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_buses_updated_at ON buses;
CREATE TRIGGER update_buses_updated_at 
    BEFORE UPDATE ON buses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at 
    BEFORE UPDATE ON routes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Insert sample data in correct order (no foreign key violations)
-- First insert users
INSERT INTO user_profiles (email, full_name, first_name, last_name, role, is_driver, is_active) VALUES
('admin@university.edu', 'System Administrator', 'System', 'Administrator', 'admin', false, true),
('driver1@university.edu', 'John Driver', 'John', 'Driver', 'driver', true, true),
('driver2@university.edu', 'Jane Driver', 'Jane', 'Driver', 'driver', true, true)
ON CONFLICT (email) DO NOTHING;

-- Then insert routes
INSERT INTO routes (name, description, distance_km, estimated_duration_minutes, city, is_active) VALUES
('Route A - University to Downtown', 'Main route connecting university to downtown area', 15.5, 45, 'Ahmedabad', true),
('Route B - University to Airport', 'Direct route to airport', 25.0, 60, 'Ahmedabad', true),
('Route C - University to Railway Station', 'Route to main railway station', 12.0, 35, 'Ahmedabad', true)
ON CONFLICT (name) DO NOTHING;

-- Then insert buses
INSERT INTO buses (bus_number, vehicle_no, capacity, model, year, is_active) VALUES
('BUS001', 'GJ-01-AB-1234', 50, 'Tata Starbus', 2020, true),
('BUS002', 'GJ-01-CD-5678', 45, 'Ashok Leyland', 2021, true),
('BUS003', 'GJ-01-EF-9012', 55, 'Volvo', 2019, true)
ON CONFLICT (bus_number) DO NOTHING;

-- Finally, update buses with assignments (after all referenced data exists)
UPDATE buses SET 
    assigned_driver_profile_id = (SELECT id FROM user_profiles WHERE email = 'driver1@university.edu' LIMIT 1),
    route_id = (SELECT id FROM routes WHERE name = 'Route A - University to Downtown' LIMIT 1)
WHERE bus_number = 'BUS001';

UPDATE buses SET 
    assigned_driver_profile_id = (SELECT id FROM user_profiles WHERE email = 'driver2@university.edu' LIMIT 1),
    route_id = (SELECT id FROM routes WHERE name = 'Route B - University to Airport' LIMIT 1)
WHERE bus_number = 'BUS002';

-- Step 10: Create management views
CREATE OR REPLACE VIEW bus_management_view AS
SELECT 
    b.id,
    b.bus_number,
    b.vehicle_no,
    b.capacity,
    b.model,
    b.year,
    b.bus_image_url,
    b.is_active,
    b.created_at,
    b.updated_at,
    b.assigned_driver_profile_id,
    up.full_name as driver_full_name,
    up.email as driver_email,
    up.first_name as driver_first_name,
    up.last_name as driver_last_name,
    b.route_id,
    r.name as route_name,
    r.distance_km,
    r.estimated_duration_minutes,
    r.city
FROM buses b
LEFT JOIN user_profiles up ON b.assigned_driver_profile_id = up.id
LEFT JOIN routes r ON b.route_id = r.id
WHERE b.is_active = true;

CREATE OR REPLACE VIEW driver_management_view AS
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.first_name,
    up.last_name,
    up.phone,
    up.role,
    up.is_driver,
    up.is_active,
    up.profile_photo_url,
    up.created_at,
    up.updated_at,
    b.id as assigned_bus_id,
    b.bus_number as assigned_bus_plate,
    r.name as route_name
FROM user_profiles up
LEFT JOIN buses b ON up.id = b.assigned_driver_profile_id AND b.is_active = true
LEFT JOIN routes r ON b.route_id = r.id
WHERE up.role = 'driver' AND up.is_active = true;

CREATE OR REPLACE VIEW route_management_view AS
SELECT 
    r.id,
    r.name,
    r.description,
    r.distance_km,
    r.estimated_duration_minutes,
    r.city,
    r.custom_origin,
    r.custom_destination,
    r.is_active,
    r.created_at,
    r.updated_at,
    COUNT(b.id) as assigned_buses_count
FROM routes r
LEFT JOIN buses b ON r.id = b.route_id AND b.is_active = true
WHERE r.is_active = true
GROUP BY r.id, r.name, r.description, r.distance_km, r.estimated_duration_minutes, 
         r.city, r.custom_origin, r.custom_destination, r.is_active, r.created_at, r.updated_at;

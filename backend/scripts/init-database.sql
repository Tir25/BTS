-- University Bus Tracking System Database Initialization Script
-- Run this script to set up the database schema for Phase 2

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'driver', 'admin')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    driver_id UUID UNIQUE, -- For driver-specific ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create buses table
CREATE TABLE IF NOT EXISTS buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number VARCHAR(20) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    model VARCHAR(100),
    year INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create routes table with PostGIS geometry
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name VARCHAR(100) NOT NULL,
    description TEXT,
    route_path GEOMETRY(LINESTRING, 4326) NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL,
    estimated_duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create driver_bus_assignments table
CREATE TABLE IF NOT EXISTS driver_bus_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(driver_id, bus_id, route_id)
);

-- Create live_locations table with PostGIS point geometry
CREATE TABLE IF NOT EXISTS live_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    speed DECIMAL(5,2), -- Speed in km/h
    heading DECIMAL(5,2), -- Heading in degrees
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_live_locations_driver_id ON live_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_timestamp ON live_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_routes_route_path ON routes USING GIST(route_path);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_drivers_driver_name ON drivers(driver_name);
CREATE INDEX IF NOT EXISTS idx_buses_bus_number ON buses(bus_number);
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_active ON driver_bus_assignments(is_active);

-- Insert sample data for testing Phase 2
INSERT INTO drivers (driver_name, license_number, phone, email) VALUES
('John Smith', 'DL123456789', '+91-9876543210', 'john.smith@university.edu'),
('Sarah Johnson', 'DL987654321', '+91-9876543211', 'sarah.johnson@university.edu'),
('Mike Wilson', 'DL456789123', '+91-9876543212', 'mike.wilson@university.edu')
ON CONFLICT (license_number) DO NOTHING;

INSERT INTO buses (bus_number, capacity, model, year) VALUES
('UNI001', 50, 'Mercedes-Benz O500', 2020),
('UNI002', 45, 'Volvo B7R', 2019),
('UNI003', 55, 'Scania K250', 2021)
ON CONFLICT (bus_number) DO NOTHING;

-- Sample routes (Ahmedabad area)
INSERT INTO routes (route_name, description, route_path, distance_km, estimated_duration_minutes) VALUES
('Route 1: Ahmedabad to Gandhinagar', 'Main campus route via SG Highway', 
 ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326), 
 25.5, 45),
('Route 2: Ahmedabad City Loop', 'City center loop route', 
 ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.5850 23.0250, 72.6000 23.0300, 72.5714 23.0225)', 4326), 
 15.2, 30),
('Route 3: Airport Express', 'Ahmedabad Airport to University', 
 ST_GeomFromText('LINESTRING(72.6349 23.0669, 72.5714 23.0225)', 4326), 
 18.7, 35)
ON CONFLICT DO NOTHING;

-- Sample driver-bus assignments
INSERT INTO driver_bus_assignments (driver_id, bus_id, route_id) VALUES
((SELECT id FROM drivers WHERE driver_name = 'John Smith' LIMIT 1),
 (SELECT id FROM buses WHERE bus_number = 'UNI001' LIMIT 1),
 (SELECT id FROM routes WHERE route_name = 'Route 1: Ahmedabad to Gandhinagar' LIMIT 1)),
((SELECT id FROM drivers WHERE driver_name = 'Sarah Johnson' LIMIT 1),
 (SELECT id FROM buses WHERE bus_number = 'UNI002' LIMIT 1),
 (SELECT id FROM routes WHERE route_name = 'Route 2: Ahmedabad City Loop' LIMIT 1)),
((SELECT id FROM drivers WHERE driver_name = 'Mike Wilson' LIMIT 1),
 (SELECT id FROM buses WHERE bus_number = 'UNI003' LIMIT 1),
 (SELECT id FROM routes WHERE route_name = 'Route 3: Airport Express' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Sample live location
INSERT INTO live_locations (driver_id, bus_id, location, speed, heading) VALUES
((SELECT id FROM drivers WHERE driver_name = 'John Smith' LIMIT 1),
 (SELECT id FROM buses WHERE bus_number = 'UNI001' LIMIT 1),
 ST_GeomFromText('POINT(72.5714 23.0225)', 4326), 35.5, 45.0)
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON buses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_bus_assignments_updated_at BEFORE UPDATE ON driver_bus_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for Supabase
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_bus_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Drivers: All authenticated users can view
CREATE POLICY "Authenticated users can view drivers" ON drivers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Buses: All authenticated users can view
CREATE POLICY "Authenticated users can view buses" ON buses
    FOR SELECT USING (auth.role() = 'authenticated');

-- Routes: All authenticated users can view
CREATE POLICY "Authenticated users can view routes" ON routes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Driver bus assignments: All authenticated users can view
CREATE POLICY "Authenticated users can view driver bus assignments" ON driver_bus_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Live locations: All authenticated users can view
CREATE POLICY "Authenticated users can view live locations" ON live_locations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Live locations: Drivers can insert their own location updates
CREATE POLICY "Drivers can insert location updates" ON live_locations
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'driver'
        )
    );

COMMIT;


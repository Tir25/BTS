-- Production RLS Policies for Bus Tracking System
-- This ensures proper security in production

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Admins can view all users" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert users" ON users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can update users" ON users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete users" ON users
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Buses table policies
CREATE POLICY "Everyone can view active buses" ON buses
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all buses" ON buses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert buses" ON buses
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can update buses" ON buses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete buses" ON buses
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Routes table policies
CREATE POLICY "Everyone can view active routes" ON routes
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all routes" ON routes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert routes" ON routes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can update routes" ON routes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete routes" ON routes
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Live locations table policies
CREATE POLICY "Everyone can view live locations" ON live_locations
FOR SELECT USING (true);

CREATE POLICY "Drivers can update their assigned bus location" ON live_locations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM buses 
    WHERE id = live_locations.bus_id 
    AND assigned_driver_id = auth.uid()::text
  )
);

CREATE POLICY "Admins can update all live locations" ON live_locations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert live locations" ON live_locations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete live locations" ON live_locations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Storage policies for bus-tracking-media bucket
CREATE POLICY "Public read access to bus-tracking-media" ON storage.objects
FOR SELECT USING (bucket_id = 'bus-tracking-media');

CREATE POLICY "Authenticated users can upload to bus-tracking-media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'bus-tracking-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins can update files in bus-tracking-media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'bus-tracking-media'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete files in bus-tracking-media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'bus-tracking-media'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname IN ('public', 'storage')
ORDER BY tablename, policyname;

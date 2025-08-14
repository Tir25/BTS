-- Setup Supabase Storage for University Bus Tracking System (PRIVATE BUCKET)
-- Run this script in Supabase SQL Editor

-- Step 1: Create the storage bucket for media files (PRIVATE)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bus-tracking-media',
  'bus-tracking-media',
  false, -- PRIVATE bucket for better security
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create storage policies for the PRIVATE bucket

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'bus-tracking-media' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to view files (for private bucket)
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT USING (
  bucket_id = 'bus-tracking-media' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'bus-tracking-media' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'bus-tracking-media' AND
  auth.role() = 'authenticated'
);

-- Step 3: Create RLS policies for the users table to include profile photos
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
FOR SELECT USING (auth.uid()::text = id::text);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy: Admins can update any user
CREATE POLICY "Admins can update any user" ON users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Step 4: Create RLS policies for the buses table to include bus images
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view buses (public information)
CREATE POLICY "Anyone can view buses" ON buses
FOR SELECT USING (true);

-- Policy: Only admins can insert buses
CREATE POLICY "Only admins can insert buses" ON buses
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Policy: Only admins can update buses
CREATE POLICY "Only admins can update buses" ON buses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Policy: Only admins can delete buses
CREATE POLICY "Only admins can delete buses" ON buses
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Step 5: Create RLS policies for the routes table to include route maps
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view routes (public information)
CREATE POLICY "Anyone can view routes" ON routes
FOR SELECT USING (true);

-- Policy: Only admins can insert routes
CREATE POLICY "Only admins can insert routes" ON routes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Policy: Only admins can update routes
CREATE POLICY "Only admins can update routes" ON routes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Policy: Only admins can delete routes
CREATE POLICY "Only admins can delete routes" ON routes
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Step 6: Verify the setup
SELECT 
  'Storage bucket created successfully (PRIVATE)' as status,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'bus-tracking-media';

-- Step 7: Show storage policies
SELECT 
  'Storage policies created for PRIVATE bucket' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Step 8: Show RLS policies
SELECT 
  'RLS policies created' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('users', 'buses', 'routes') AND schemaname = 'public';

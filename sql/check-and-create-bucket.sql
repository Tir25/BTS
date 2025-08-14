-- Check and Create Bucket - Supabase Storage
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Check if bucket exists
SELECT 
    'Current Buckets:' as info,
    name as bucket_name,
    public as is_public,
    created_at,
    updated_at
FROM storage.buckets 
ORDER BY name;

-- Step 2: Check if our specific bucket exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'bus-tracking-media')
        THEN 'Bucket exists'
        ELSE 'Bucket does not exist'
    END as bucket_status,
    name as bucket_name,
    public as is_public
FROM storage.buckets 
WHERE name = 'bus-tracking-media';

-- Step 3: Create bucket if it doesn't exist
-- Note: This will only work if the bucket doesn't already exist
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
SELECT 
    'bus-tracking-media' as id,
    'bus-tracking-media' as name,
    true as public,
    NOW() as created_at,
    NOW() as updated_at
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'bus-tracking-media'
);

-- Step 4: Verify bucket was created
SELECT 
    'After Creation - Bucket Status:' as info,
    name as bucket_name,
    public as is_public,
    created_at
FROM storage.buckets 
WHERE name = 'bus-tracking-media';

-- Step 5: Check storage policies
SELECT 
    'Storage Policies:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- Step 6: Create storage policies if they don't exist
-- Allow public read access to all files in our bucket
CREATE POLICY IF NOT EXISTS "Public Access bus-tracking-media" ON storage.objects
FOR SELECT USING (bucket_id = 'bus-tracking-media');

-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Authenticated users can upload bus-tracking-media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'bus-tracking-media' AND auth.role() = 'authenticated');

-- Allow users to update their own files
CREATE POLICY IF NOT EXISTS "Users can update own files bus-tracking-media" ON storage.objects
FOR UPDATE USING (bucket_id = 'bus-tracking-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY IF NOT EXISTS "Users can delete own files bus-tracking-media" ON storage.objects
FOR DELETE USING (bucket_id = 'bus-tracking-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Step 7: Verify policies were created
SELECT 
    'Updated Storage Policies:' as info,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%bus-tracking-media%'
ORDER BY policyname;

-- Step 8: Test bucket access (this will show bucket info)
SELECT 
    'Bucket Test:' as info,
    'Bucket should be accessible now' as status,
    NOW() as test_time;
